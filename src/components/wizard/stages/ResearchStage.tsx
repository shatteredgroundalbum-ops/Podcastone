import { useCallback, useEffect, useState } from "react"
import {
  ChevronRight,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  RefreshCw,
} from "lucide-react"

import type { PodcastSession } from "@/types"
import { isTrueCrime } from "@/types"
import { useSession } from "@/contexts/SessionContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { WizardPageLayout } from "@/components/wizard/WizardPageLayout"

type Phase = "notStarted" | "loading" | "streaming" | "done" | "error"

function str(session: PodcastSession | null, key: string): string {
  const v = session?.data[key]
  return typeof v === "string" ? v : ""
}

function arr(session: PodcastSession | null, key: string): string[] {
  const v = session?.data[key]
  return Array.isArray(v) ? (v as string[]) : []
}

export function ResearchStage() {
  const {
    session, setField, getField, nextStep,
    aiStatus, aiContent, aiModel, aiError, streamAI, cancelAI,
  } = useSession()

  const existingSummary = str(session, "aiResearchSummary")
  const podcastType = str(session, "podcastType")
  const tc = isTrueCrime(podcastType)
  const subjectChip = tc ? str(session, "tcCaseOrPersonName") : str(session, "subject")

  const optionalLinks = arr(session, "optionalLinks")
  const excludedSources = arr(session, "excludedSources")

  const [sourceInput, setSourceInput] = useState("")
  const [excludeInput, setExcludeInput] = useState("")

  // Local phase derived from aiStatus + whether we already have a summary.
  const [phase, setPhase] = useState<Phase>(() => {
    if (existingSummary.trim()) return "done"
    return "notStarted"
  })

  // The text we display: live stream content while streaming, otherwise stored summary.
  const [displayed, setDisplayed] = useState<string>(existingSummary)

  // Sync displayed text with streaming content.
  useEffect(() => {
    if (aiStatus === "streaming" || aiStatus === "loading") {
      setDisplayed(aiContent)
    }
  }, [aiContent, aiStatus])

  // Map aiStatus → local phase while AI is active.
  useEffect(() => {
    if (aiStatus === "loading") setPhase("loading")
    else if (aiStatus === "streaming") setPhase("streaming")
    else if (aiStatus === "error") setPhase("error")
    else if (aiStatus === "done") {
      // Only flip to done if we have content (the stream just finished).
      if (aiContent.trim()) {
        setDisplayed(aiContent)
        setField("aiResearchSummary", aiContent)
        setPhase("done")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiStatus])

  const handleBegin = useCallback(() => {
    setPhase("loading")
    setDisplayed("")
    void streamAI("research")
  }, [streamAI])

  const handlePause = useCallback(() => {
    cancelAI()
    // Keep whatever was streamed so far.
    if (aiContent.trim()) {
      setDisplayed(aiContent)
      setField("aiResearchSummary", aiContent)
      setPhase("done")
    } else {
      setPhase("notStarted")
    }
  }, [aiContent, cancelAI, setField])

  const handleRetry = useCallback(() => {
    setPhase("loading")
    setDisplayed("")
    void streamAI("research")
  }, [streamAI])

  const handleResearchMore = useCallback(() => {
    setPhase("loading")
    setDisplayed("")
    void streamAI("research")
  }, [streamAI])

  const handleApprove = useCallback(() => {
    if (aiContent.trim()) {
      setField("aiResearchSummary", aiContent)
    }
    void nextStep()
  }, [aiContent, nextStep, setField])

  const addSource = () => {
    const trimmed = sourceInput.trim()
    if (!trimmed) return
    if (optionalLinks.includes(trimmed)) {
      setSourceInput("")
      return
    }
    const next = [...optionalLinks, trimmed]
    setField("optionalLinks", next)
    setSourceInput("")
  }

  const removeSource = (link: string) => {
    const next = optionalLinks.filter((l) => l !== link)
    setField("optionalLinks", next)
  }

  const addExclude = () => {
    const trimmed = excludeInput.trim()
    if (!trimmed) return
    if (excludedSources.includes(trimmed)) {
      setExcludeInput("")
      return
    }
    const next = [...excludedSources, trimmed]
    setField("excludedSources", next)
    setExcludeInput("")
  }

  const removeExclude = (s: string) => {
    const next = excludedSources.filter((x) => x !== s)
    setField("excludedSources", next)
  }

  const phaseLabel: Record<Phase, string> = {
    notStarted: "Ready to begin",
    loading: "Preparing research…",
    streaming: "Researching your topic…",
    done: "Research complete",
    error: "Research failed",
  }

  const isBusy = phase === "loading" || phase === "streaming"

  return (
    <WizardPageLayout
      title="Research"
      description="Let the AI gather background research and key facts for your episode."
      footer={
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {phase === "done" && (
              <CheckCircle2 className="size-4 text-success" style={{ color: "hsl(var(--success))" }} />
            )}
            {phase === "error" && <AlertCircle className="size-4 text-destructive" />}
            {isBusy && <Loader2 className="size-4 animate-spin text-primary" />}
            <span>{phaseLabel[phase]}</span>
          </div>
          <div className="flex items-center gap-2">
            {phase === "notStarted" && (
              <Button onClick={handleBegin}>
                <Sparkles className="size-4" /> Begin Research
              </Button>
            )}
            {isBusy && (
              <Button variant="outline" onClick={handlePause} disabled={phase === "loading"}>
                Pause
              </Button>
            )}
            {phase === "done" && (
              <>
                <Button variant="outline" onClick={handleResearchMore}>
                  <RefreshCw className="size-4" /> Research More
                </Button>
                <Button onClick={handleApprove}>
                  Approve Research <ChevronRight className="size-4" />
                </Button>
              </>
            )}
            {phase === "error" && (
              <Button onClick={handleRetry}>
                <RefreshCw className="size-4" /> Retry
              </Button>
            )}
          </div>
        </>
      }
    >
      <div className="space-y-6">
        {/* Subject confirmation chip */}
        {subjectChip.trim() && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Researching:</span>
            <Badge variant="secondary" className="max-w-full py-1.5">
              <span className="truncate">{subjectChip}</span>
            </Badge>
          </div>
        )}

        {/* Provider badge */}
        {aiModel && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3" />
            <span>via Together.AI · {aiModel}</span>
          </div>
        )}

        {/* Status / content card */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            {phase === "notStarted" && (
              <div className="flex flex-col items-start gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  <h3 className="text-base font-medium">AI-Powered Research</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  We'll gather relevant background information, key facts, and context for your episode.
                  Add any specific sources you'd like us to consult below.
                </p>
              </div>
            )}

            {phase === "loading" && (
              <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-primary" />
                Preparing your research…
              </div>
            )}

            {(phase === "streaming" || (isBusy && displayed)) && (
              <div
                className={cn(
                  "max-h-[50vh] min-h-[200px] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed",
                  phase === "streaming" && "streaming-cursor"
                )}
              >
                {displayed || (
                  <span className="italic text-muted-foreground">Waiting for stream…</span>
                )}
              </div>
            )}

            {phase === "done" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className="size-5"
                    style={{ color: "hsl(var(--success))" }}
                  />
                  <h3 className="text-base font-medium">Research Summary</h3>
                </div>
                <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">
                  {displayed || existingSummary}
                </div>
              </div>
            )}

            {phase === "error" && (
              <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <AlertCircle className="size-5 shrink-0 text-destructive" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Research failed</p>
                  <p className="mt-1 text-muted-foreground">
                    {aiError || "Something went wrong. Please try again."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source inputs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Add source */}
          <div className="space-y-2">
            <Label htmlFor="source-input" className="text-sm font-medium">
              Add a Source
            </Label>
            <div className="flex gap-2">
              <Input
                id="source-input"
                value={sourceInput}
                onChange={(e) => setSourceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addSource()
                  }
                }}
                placeholder="https://example.com"
                className="h-11"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addSource}
                disabled={!sourceInput.trim()}
                className="h-11 shrink-0"
              >
                <Plus className="size-4" /> Add
              </Button>
            </div>
            {optionalLinks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {optionalLinks.map((l) => (
                  <Badge key={l} variant="secondary" className="gap-1.5 py-1.5 pl-3 pr-1.5">
                    <span className="max-w-[200px] truncate">{l}</span>
                    <button
                      type="button"
                      onClick={() => removeSource(l)}
                      aria-label={`Remove ${l}`}
                      className="rounded-full p-0.5 hover:bg-background/60"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Exclude source */}
          <div className="space-y-2">
            <Label htmlFor="exclude-input" className="text-sm font-medium">
              Exclude a Source
            </Label>
            <div className="flex gap-2">
              <Input
                id="exclude-input"
                value={excludeInput}
                onChange={(e) => setExcludeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addExclude()
                  }
                }}
                placeholder="https://example.com to avoid"
                className="h-11"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addExclude}
                disabled={!excludeInput.trim()}
                className="h-11 shrink-0"
              >
                <Plus className="size-4" /> Add
              </Button>
            </div>
            {excludedSources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {excludedSources.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="gap-1.5 border-destructive/30 py-1.5 pl-3 pr-1.5 text-destructive"
                  >
                    <span className="max-w-[200px] truncate">{s}</span>
                    <button
                      type="button"
                      onClick={() => removeExclude(s)}
                      aria-label={`Remove ${s}`}
                      className="rounded-full p-0.5 hover:bg-destructive/10"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Existing summary notice (already completed state) */}
        {phase === "done" && existingSummary.trim() && (
          <>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Research was previously completed. You can approve it, or run "Research More" to gather
              additional context.
            </p>
          </>
        )}
      </div>
    </WizardPageLayout>
  )
}
