import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  RefreshCw,
  Columns2,
} from "lucide-react"

import type { AITask } from "@/types"
import { useSession } from "@/contexts/SessionContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { WizardPageLayout } from "@/components/wizard/WizardPageLayout"
import { CompareDraftsView } from "@/components/wizard/stages/CompareDraftsView"

interface DraftStageProps {
  draftNum: 1 | 2
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function DraftStage({ draftNum }: DraftStageProps) {
  const {
    session, setField, getField, nextStep, prevStep,
    aiStatus, aiContent, aiModel, streamAI, cancelAI,
  } = useSession()

  const scriptKey = `draft${draftNum}Script` as const
  const feedbackKey = `draft${draftNum}Feedback` as const

  const script = (getField(scriptKey) as string) || ""
  const feedback = (getField(feedbackKey) as string) || ""

  const [draftText, setDraftText] = useState<string>(script)
  const [feedbackText, setFeedbackText] = useState<string>(feedback)
  const [showCompare, setShowCompare] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external changes (e.g. after AI generation completes) into local state.
  useEffect(() => {
    setDraftText(script)
  }, [script])

  useEffect(() => {
    setFeedbackText(feedback)
  }, [feedback])

  const isStreaming = aiStatus === "streaming" || aiStatus === "loading"
  const isGeneratingThis =
    isStreaming && (draftNum === 1 || draftNum === 2) // both drafts stream via draft1/draft2 tasks

  // Debounced save for editor text.
  useEffect(() => {
    if (draftText === script) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setField(scriptKey, draftText)
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [draftText, script, scriptKey, setField])

  const handleGenerate = useCallback(() => {
    const task: AITask = draftNum === 1 ? "draft1" : "draft2"
    setField(scriptKey, "")
    setDraftText("")
    streamAI(task, (content) => {
      setField(scriptKey, content)
      setDraftText(content)
    })
  }, [draftNum, scriptKey, setField, streamAI])

  const handleCancel = useCallback(() => {
    cancelAI()
    if (aiContent) {
      setField(scriptKey, aiContent)
      setDraftText(aiContent)
    }
  }, [aiContent, cancelAI, scriptKey, setField])

  const wordCount = useMemo(() => countWords(draftText), [draftText])
  const estRuntimeMin = Math.max(0, Math.round((wordCount / 150) * 10) / 10)

  // Live streaming text shown in the editor.
  const displayedText = isGeneratingThis && aiContent ? aiContent : draftText

  if (showCompare && draftNum === 2) {
    return <CompareDraftsView onBack={() => setShowCompare(false)} />
  }

  const hasContent = draftText.trim().length > 0

  return (
    <WizardPageLayout
      title={`Draft ${draftNum}`}
      description={
        draftNum === 1
          ? "Generate the first full draft of your podcast script."
          : "Refine the script using your notes from Draft 1."
      }
      footer={
        <>
          <Button variant="ghost" onClick={prevStep}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {hasContent && !isGeneratingThis && (
              <Button variant="outline" onClick={handleGenerate}>
                <RefreshCw className="size-4" /> Regenerate
              </Button>
            )}
            <Button onClick={nextStep} disabled={!hasContent || isGeneratingThis}>
              Continue <ChevronRight className="size-4" />
            </Button>
          </div>
        </>
      }
    >
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Words:</span>{" "}
            <span className="font-medium tabular-nums">{wordCount.toLocaleString()}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Est. runtime:</span>{" "}
            <span className="font-medium tabular-nums">{estRuntimeMin} min</span>
          </div>
          {isGeneratingThis && (
            <Badge variant="secondary" className="ml-auto gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              Generating with {aiModel || "AI"}…
            </Badge>
          )}
        </div>

        {/* Generate / Regenerate card */}
        {!hasContent && !isGeneratingThis && (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 pt-6">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h3 className="text-base font-medium">Generate Draft {draftNum} with AI</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {draftNum === 1
                  ? "We'll use your research summary and episode details to write a complete first draft."
                  : "We'll refine Draft 1 using your notes to produce an improved second draft."}
              </p>
              <Button onClick={handleGenerate}>
                <Sparkles className="size-4" /> Generate Draft {draftNum}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Streaming controls */}
        {isGeneratingThis && (
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
            <span className="text-sm text-primary">Streaming draft…</span>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Stop
            </Button>
          </div>
        )}

        {/* Editor */}
        <div className="space-y-2">
          <Label htmlFor="draft-editor" className="text-sm font-medium">
            Script
          </Label>
          <Textarea
            id="draft-editor"
            value={displayedText}
            onChange={(e) => setDraftText(e.target.value)}
            disabled={isGeneratingThis}
            placeholder="Your script will appear here. You can also write or edit directly."
            className={cn(
              "script-editor min-h-[500px] w-full resize-y rounded-md border bg-background p-4 text-base",
              isGeneratingThis && "streaming-cursor"
            )}
          />
        </div>

        {/* Feedback */}
        <div className="space-y-2">
          <Label htmlFor="draft-feedback" className="text-sm font-medium">
            Notes for Next Draft
          </Label>
          <Textarea
            id="draft-feedback"
            value={feedbackText}
            onChange={(e) => {
              setFeedbackText(e.target.value)
              setField(feedbackKey, e.target.value)
            }}
            placeholder="What should change in the next draft? Tone, pacing, sections to expand or cut…"
            className="min-h-[120px] w-full resize-y"
          />
        </div>

        {/* Compare drafts (Draft 2 only) */}
        {draftNum === 2 && (
          <Button variant="outline" onClick={() => setShowCompare(true)} className="w-full">
            <Columns2 className="size-4" /> Compare Drafts
          </Button>
        )}
      </div>
    </WizardPageLayout>
  )
}
