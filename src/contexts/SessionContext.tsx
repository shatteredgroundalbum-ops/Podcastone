import {
  createContext, useContext, useState, useCallback, useRef, type ReactNode
} from "react"
import type { PodcastSession, AITask, AIStatus } from "@/types"

interface SessionContextValue {
  session: PodcastSession | null
  sessions: PodcastSession[]
  isSaving: boolean
  loadSessions: () => Promise<void>
  createSession: (projectName: string) => Promise<PodcastSession>
  loadSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  setField: (key: string, value: unknown) => void
  setFields: (fields: Record<string, unknown>) => void
  getField: (key: string) => unknown
  nextStep: () => Promise<void>
  prevStep: () => Promise<void>
  goToStage: (stage: number, section?: number) => Promise<void>
  clearSession: () => void
  // AI
  aiStatus: AIStatus
  aiContent: string
  aiModel: string
  aiError: string
  streamAI: (task: AITask, onDone?: (content: string) => void) => Promise<void>
  cancelAI: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

function getToken() {
  return localStorage.getItem("podcast_token") || ""
}

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PodcastSession | null>(null)
  const [sessions, setSessions] = useState<PodcastSession[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [aiStatus, setAIStatus] = useState<AIStatus>("idle")
  const [aiContent, setAIContent] = useState("")
  const [aiModel, setAIModel] = useState("")
  const [aiError, setAIError] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/sessions", { headers: authHeaders() })
    if (res.ok) setSessions(await res.json())
  }, [])

  const createSession = useCallback(async (projectName: string) => {
    const res = await fetch("/api/sessions", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ project_name: projectName }),
    })
    const s: PodcastSession = await res.json()
    setSession(s)
    setSessions(prev => [s, ...prev])
    return s
  }, [])

  const loadSession = useCallback(async (id: string) => {
    const res = await fetch(`/api/sessions/${id}`, { headers: authHeaders() })
    if (res.ok) setSession(await res.json())
  }, [])

  const deleteSession = useCallback(async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: "DELETE", headers: authHeaders() })
    setSessions(prev => prev.filter(s => s.id !== id))
    if (session?.id === id) setSession(null)
  }, [session])

  const saveSession = useCallback(async (updated: PodcastSession) => {
    if (!updated) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/sessions/${updated.id}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({
          project_name: updated.project_name,
          current_stage: updated.current_stage,
          current_section: updated.current_section,
          data: updated.data,
        }),
      })
      if (res.ok) {
        // Only update the sessions list — do NOT overwrite local session state
        // (we already applied it optimistically; overwriting causes stage resets)
        const saved = await res.json()
        setSessions(prev => prev.map(s => s.id === saved.id ? saved : s))
      }
    } finally {
      setIsSaving(false)
    }
  }, [])

  const debouncedSave = useCallback((s: PodcastSession) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveSession(s), 800)
  }, [saveSession])

  const setField = useCallback((key: string, value: unknown) => {
    setSession(prev => {
      if (!prev) return prev
      const updated = { ...prev, data: { ...prev.data, [key]: value } }
      debouncedSave(updated)
      return updated
    })
  }, [debouncedSave])

  const setFields = useCallback((fields: Record<string, unknown>) => {
    setSession(prev => {
      if (!prev) return prev
      const updated = { ...prev, data: { ...prev.data, ...fields } }
      debouncedSave(updated)
      return updated
    })
  }, [debouncedSave])

  const getField = useCallback((key: string) => {
    return session?.data[key]
  }, [session])

  const nextStep = useCallback(async () => {
    if (!session) return
    // Cancel any pending debounced save to prevent stale stage overwrite
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    let updated: PodcastSession
    if (session.current_stage === 1) {
      if (session.current_section < 1) {
        updated = { ...session, current_section: session.current_section + 1 }
      } else {
        updated = { ...session, current_stage: 2, current_section: 0 }
      }
    } else if (session.current_stage < 12) {
      updated = { ...session, current_stage: session.current_stage + 1, current_section: 0 }
    } else {
      return
    }
    setSession(updated)
    await saveSession(updated)
  }, [session, saveSession])

  const prevStep = useCallback(async () => {
    if (!session) return
    // Cancel any pending debounced save to prevent stale stage overwrite
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    let updated: PodcastSession
    if (session.current_stage === 1) {
      if (session.current_section > 0) {
        updated = { ...session, current_section: session.current_section - 1 }
      } else return
    } else {
      const newStage = session.current_stage - 1
      updated = { ...session, current_stage: newStage, current_section: newStage === 1 ? 1 : 0 }
    }
    setSession(updated)
    await saveSession(updated)
  }, [session, saveSession])

  const goToStage = useCallback(async (stage: number, section = 0) => {
    if (!session) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const updated = { ...session, current_stage: stage, current_section: section }
    setSession(updated)
    await saveSession(updated)
  }, [session, saveSession])

  const clearSession = useCallback(() => setSession(null), [])

  const streamAI = useCallback(async (task: AITask, onDone?: (content: string) => void) => {
    if (!session) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setAIStatus("loading")
    setAIContent("")
    setAIModel("")
    setAIError("")

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ task, session_data: session.data }),
        signal: ctrl.signal,
      })
      if (!res.ok) throw new Error(`AI error ${res.status}`)

      setAIStatus("streaming")
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        const lines = text.split("\n")
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = line.slice(6).trim()
          if (payload === "[DONE]") { setAIStatus("done"); break }
          try {
            const parsed = JSON.parse(payload)
            if (parsed.model) setAIModel(parsed.model)
            if (parsed.token) {
              accumulated += parsed.token
              setAIContent(accumulated)
            }
          } catch { /* ignore malformed */ }
        }
      }
      setAIStatus("done")
      onDone?.(accumulated)
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return
      setAIStatus("error")
      setAIError((err as Error).message || "AI generation failed")
    }
  }, [session])

  const cancelAI = useCallback(() => {
    abortRef.current?.abort()
    setAIStatus("idle")
  }, [])

  return (
    <SessionContext.Provider value={{
      session, sessions, isSaving,
      loadSessions, createSession, loadSession, deleteSession,
      setField, setFields, getField, nextStep, prevStep, goToStage, clearSession,
      aiStatus, aiContent, aiModel, aiError, streamAI, cancelAI,
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}
