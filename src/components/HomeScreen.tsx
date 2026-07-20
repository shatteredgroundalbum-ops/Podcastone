import { useState, useEffect, useRef, useCallback } from "react"
import {
  Podcast, Plus, FileText, Trash2, Clock, ArrowRight, Settings,
  Send, User as UserIcon, Bot, Sparkles, Loader2,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useSession } from "@/contexts/SessionContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AIProviderSelector } from "@/components/AIProviderSelector"
import { SettingsDialog } from "@/components/SettingsDialog"
import { STAGE_NAMES } from "@/types"

interface HomeScreenProps {
  onStartWizard: (sessionId: string) => void
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  provider?: string
  model?: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function HomeScreen({ onStartWizard }: HomeScreenProps) {
  const { user, logout } = useAuth()
  const { sessions, loadSessions, createSession, deleteSession, loadSession } = useSession()
  const [newProjectName, setNewProjectName] = useState("")
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your podcast production assistant. Ask me anything about planning, researching, or writing your podcast. I can help brainstorm topics, structure episodes, suggest interview questions, and more!",
      provider: "system",
    },
  ])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [provider, setProvider] = useState("auto")
  const [currentProvider, setCurrentProvider] = useState<string | undefined>()
  const [currentModel, setCurrentModel] = useState<string | undefined>()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleCreate = async () => {
    if (!newProjectName.trim()) return
    setCreating(true)
    try {
      const s = await createSession(newProjectName.trim())
      setNewProjectName("")
      setDialogOpen(false)
      onStartWizard(s.id)
    } catch (err) {
      console.error("Failed to create session", err)
    } finally {
      setCreating(false)
    }
  }

  const handleOpen = async (id: string) => {
    await loadSession(id)
    onStartWizard(id)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteSession(id)
  }

  const stageLabel = (stage: number, section: number): string => {
    if (stage === 1 && section === 0) return "Brainstorm (Step 1/2)"
    if (stage === 1 && section === 1) return "Brainstorm (Step 2/2)"
    return STAGE_NAMES[stage] || `Stage ${stage}`
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput("")
    setStreaming(true)
    setCurrentProvider(undefined)
    setCurrentModel(undefined)

    const userMsg: ChatMessage = { role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])

    const abortController = new AbortController()
    abortRef.current = abortController

    const msgsForApi = messages.filter((m) => m.provider !== "system").concat(userMsg).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("podcast_token")}`,
        },
        body: JSON.stringify({ messages: msgsForApi, provider }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.detail || "Request failed"}` },
        ])
        setStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let buffer = ""
      let assistantContent = ""

      setMessages((prev) => [...prev, { role: "assistant", content: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (data === "[DONE]") continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.token) {
              assistantContent += parsed.token
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: "assistant", content: assistantContent }
                return updated
              })
            }
            if (parsed.provider) {
              setCurrentProvider(parsed.provider)
              setCurrentModel(parsed.model)
            }
            if (parsed.error) {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: `Error: ${parsed.error}` },
              ])
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      // Final update with provider info
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            provider: currentProvider,
            model: currentModel,
          }
        }
        return updated
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.message}` },
        ])
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, streaming, messages, provider, currentProvider, currentModel])

  const handleStop = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card shrink-0">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
            >
              {sidebarOpen ? <Podcast className="h-4 w-4" /> : <Podcast className="h-4 w-4" />}
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Podcast className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Podcast One</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <UserIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="gap-2">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Projects */}
        <aside
          className={`border-r bg-card shrink-0 transition-all duration-200 flex flex-col ${
            sidebarOpen ? "w-72" : "w-0 overflow-hidden"
          }`}
        >
          <div className="p-3 flex flex-col gap-1 flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Projects</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>

            <ScrollArea className="flex-1 -mr-2 pr-2">
              <div className="space-y-1">
                {sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">No projects yet</p>
                    <Button variant="link" size="sm" className="text-xs mt-1" onClick={() => setDialogOpen(true)}>
                      Create your first project
                    </Button>
                  </div>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleOpen(s.id)}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-accent transition-colors group cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{s.project_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {stageLabel(s.current_stage, s.current_section || 0)}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-0.5">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDate(s.updated_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(e, s.id) }}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Provider selector bar */}
          <div className="border-b bg-card px-4 py-2 flex items-center gap-3 shrink-0">
            <div className="w-48">
              <AIProviderSelector provider={provider} onProviderChange={setProvider} />
            </div>
            {currentProvider && (
              <Badge variant="outline" className="gap-1.5 text-xs">
                <Sparkles className="h-3 w-3 text-primary" />
                {currentProvider} · {currentModel?.split("/").pop()}
              </Badge>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && msg.provider !== "system" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === "assistant" && msg.provider && msg.provider !== "system" && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 opacity-60">
                        via {msg.provider} · {msg.model?.split("/").pop()}
                      </p>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary mt-1">
                      <UserIcon className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t bg-card px-4 py-3 shrink-0">
            <div className="mx-auto max-w-3xl flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    streaming ? handleStop() : handleSend()
                  }
                }}
                placeholder={streaming ? "AI is responding..." : "Ask about podcasting, brainstorm ideas..."}
                disabled={streaming}
                className="flex-1"
              />
              <Button
                onClick={streaming ? handleStop : handleSend}
                disabled={!streaming && !input.trim()}
                variant={streaming ? "destructive" : "default"}
                size="sm"
                className="gap-2"
              >
                {streaming ? (
                  <>Stop</>
                ) : (
                  <><Send className="h-4 w-4" /> Send</>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* New Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={creating || !newProjectName.trim()} className="flex-1 gap-2">
                {creating ? "Creating..." : "Create & Open Wizard"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}