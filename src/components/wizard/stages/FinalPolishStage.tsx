import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronLeft, ChevronRight, Loader2, Sparkles, RefreshCw,
} from "lucide-react"

import { useSession } from "@/contexts/SessionContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { WizardPageLayout } from "@/components/wizard/WizardPageLayout"

const WPM_OPTIONS = [120, 140, 150, 160, 180]

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function parseRuntimeMinutes(runtime?: string): number {
  if (!runtime) return 15
  const match = runtime.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 15
}

export function FinalPolishStage() {
  const {
    session, setField, getField, nextStep, prevStep,
    aiStatus, aiContent, aiModel, streamAI, cancelAI,
  } = useSession()

  const sourceScript =
    ((session?.data.draft2Script as string) || (session?.data.draft1Script as string) || "").trim()

  const finalScript = (getField("finalScript") as string) || ""
  const polishFeedback = (getField("polishFeedback") as string) || ""
  const pronunciationNotes = (getField("pronunciationNotes") as string) || ""
  const speakingWpm = (getField("speakingWpm") as number) || 150
  const approved = Boolean(getField("finalApproved"))

  const [editorText, setEditorText] = useState<string>(finalScript)
  const [feedbackText, setFeedbackText] = useState<string>(polishFeedback)
  const [pronText, setPronText] = useState<string>(pronunciationNotes)
  const [isApproved, setIsApproved] = useState<boolean>(approved)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Seed editor from source script if finalScript is empty.
  useEffect(() => {
    if (!finalScript && sourceScript) {
      setEditorText(sourceScript)
      setField("finalScript", sourceScript)
    } else {
      setEditorText(finalScript)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setFeedbackText(polishFeedback)
  }, [polishFeedback])

  useEffect(() => {
    setPronText(pronunciationNotes)
  }, [pronunciationNotes])

  const isStreaming = aiStatus === "streaming" || aiStatus === "loading"

  // Debounced save for editor text.
  useEffect(() => {
    if (editorText === finalScript) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setField("finalScript", editorText)
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [editorText, finalScript, setField])

  const handlePolish = useCallback(() => {
    streamAI("polish", (content) => {
      setField("finalScript", content)
      setEditorText(content)
    })
  }, [setField, streamAI])

  const handleCancel = useCallback(() => {
    cancelAI()
    if (aiContent) {
      setField("finalScript", aiContent)
      setEditorText(aiContent)
    }
  }, [aiContent, cancelAI, setField])

  const wordCount = useMemo(() => countWords(editorText), [editorText])
  const targetMinutes = parseRuntimeMinutes(session?.data.runtime as string)
  const targetWords = targetMinutes * speakingWpm
  const estRuntimeMin = speakingWpm > 0 ? Math.round((wordCount / speakingWpm) * 10) / 10 : 0

  // Length score heuristic.
  const ratio = targetWords > 0 ? wordCount / targetWords : 1
  const lengthScore: { label: string; tone: "good" | "short" | "long"; color: string } =
    ratio >= 0.9 && ratio <= 1.1
      ? { label: "Good", tone: "good", color: "bg-green-500" }
      : ratio < 0.9
        ? { label: "Short", tone: "short", color: "bg-yellow-500" }
        : ratio > 1.25
          ? { label: "Long", tone: "long", color: "bg-red-500" }
          : { label: "Long", tone: "long", color: "bg-yellow-500" }

  const displayedText = isStreaming && aiContent ? aiContent : editorText
  const hasContent = editorText.trim().length > 0

  return (
    <WizardPageLayout
      title="Final Polish"
      description="Polish the script for delivery, then approve it for production."
      footer={
        <>
          <Button variant="ghost" onClick={prevStep}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {hasContent && !isStreaming && (
              <Button variant="outline" onClick={handlePolish}>
                <RefreshCw className="size-4" /> Polish Again
              </Button>
            )}
            <Button onClick={nextStep} disabled={!isApproved || !hasContent || isStreaming}>
              Approve Script <ChevronRight className="size-4" />
            </Button>
          </div>
        </>
      }
    >
      <div className="space-y-6">
        {/* Info strip */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card px-4 py-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Words:</span>{" "}
            <span className="font-medium tabular-nums">{wordCount.toLocaleString()}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Est. runtime:</span>{" "}
            <span className="font-medium tabular-nums">{estRuntimeMin} min</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Pace:</span>
            <Select
              value={String(speakingWpm)}
              onValueChange={(v) => setField("speakingWpm", parseInt(v, 10))}
            >
              <SelectTrigger className="h-8 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WPM_OPTIONS.map((wpm) => (
                  <SelectItem key={wpm} value={String(wpm)}>
                    {wpm} WPM
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isStreaming && (
            <Badge variant="secondary" className="gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              Polishing with {aiModel || "AI"}…
            </Badge>
          )}
        </div>

        {/* Polish button / streaming controls */}
        {!hasContent && !isStreaming && (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 pt-6">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h3 className="text-base font-medium">Polish with AI</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                We'll refine the chosen draft for delivery — pacing, transitions, and natural
                spoken rhythm.
              </p>
              <Button onClick={handlePolish} disabled={!sourceScript}>
                <Sparkles className="size-4" /> Polish Script
              </Button>
              {!sourceScript && (
                <p className="text-xs text-destructive">
                  No source draft found. Go back and generate a draft first.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isStreaming && (
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
            <span className="text-sm text-primary">Polishing script…</span>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Stop
            </Button>
          </div>
        )}

        {/* Editor */}
        <div className="space-y-2">
          <Label htmlFor="final-editor" className="text-sm font-medium">
            Final Script
          </Label>
          <Textarea
            id="final-editor"
            value={displayedText}
            onChange={(e) => setEditorText(e.target.value)}
            disabled={isStreaming}
            placeholder="Your polished script will appear here."
            className={cn(
              "script-editor min-h-[500px] w-full resize-y rounded-md border bg-background p-4 text-base",
              isStreaming && "streaming-cursor"
            )}
          />
        </div>

        {/* Quality score */}
        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div>
              <p className="text-sm font-medium">Length Score</p>
              <p className="text-xs text-muted-foreground">
                Target: {targetWords.toLocaleString()} words ({targetMinutes} min @ {speakingWpm} WPM)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full transition-all", lengthScore.color)}
                  style={{ width: `${Math.min(100, Math.max(5, ratio * 50))}%` }}
                />
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  lengthScore.tone === "good" && "border-green-500/30 bg-green-500/10 text-green-700",
                  lengthScore.tone === "short" && "border-yellow-500/30 bg-yellow-500/10 text-yellow-700",
                  lengthScore.tone === "long" && "border-red-500/30 bg-red-500/10 text-red-700"
                )}
              >
                {lengthScore.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Polish feedback */}
        <div className="space-y-2">
          <Label htmlFor="polish-feedback" className="text-sm font-medium">
            Polish Notes
          </Label>
          <Textarea
            id="polish-feedback"
            value={feedbackText}
            onChange={(e) => {
              setFeedbackText(e.target.value)
              setField("polishFeedback", e.target.value)
            }}
            placeholder="Notes on what the polish should focus on."
            className="min-h-[100px] w-full resize-y"
          />
        </div>

        {/* Pronunciation notes */}
        <div className="space-y-2">
          <Label htmlFor="pron-notes" className="text-sm font-medium">
            Pronunciation Notes
          </Label>
          <Textarea
            id="pron-notes"
            value={pronText}
            onChange={(e) => {
              setPronText(e.target.value)
              setField("pronunciationNotes", e.target.value)
            }}
            placeholder="Names, terms, or words that need specific pronunciation guidance."
            className="min-h-[100px] w-full resize-y"
          />
        </div>

        {/* Approval */}
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <Checkbox
              id="approve"
              checked={isApproved}
              onCheckedChange={(v) => {
                const checked = Boolean(v)
                setIsApproved(checked)
                setField("finalApproved", checked)
              }}
              className="mt-0.5"
            />
            <Label htmlFor="approve" className="text-sm font-medium leading-relaxed">
              Script approved and ready for production
              <span className="block text-xs font-normal text-muted-foreground">
                Confirm the script is final and ready to be turned into production blocks.
              </span>
            </Label>
          </CardContent>
        </Card>
      </div>
    </WizardPageLayout>
  )
}
