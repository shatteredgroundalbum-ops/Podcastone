import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  Plus,
  RefreshCw,
  BookOpen,
  Mic2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { WizardPageLayout } from "@/components/wizard/WizardPageLayout"

function str(session: PodcastSession | null, key: string): string {
  const v = session?.data[key]
  return typeof v === "string" ? v : ""
}

function arr(session: PodcastSession | null, key: string): string[] {
  const v = session?.data[key]
  return Array.isArray(v) ? (v as string[]) : []
}

/**
 * Parse title suggestions from the AI output. The model typically returns a
 * numbered or bulleted list. We extract non-empty lines and strip leading
 * list markers / quotes.
 */
function parseTitles(raw: string): string[] {
  if (!raw.trim()) return []
  const lines = raw.split(/\r?\n/)
  const titles: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // Strip leading list markers: "1.", "1)", "-", "*", "•"
    const stripped = trimmed
      .replace(/^(\d+[\.\)]\s*|[-*•]\s*)/, "")
      // Strip surrounding quotes
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
      .trim()
    if (stripped && stripped.length > 2) {
      titles.push(stripped)
    }
  }
  return titles
}

export function ResearchReviewStage() {
  const {
    session, setField, getField, nextStep, prevStep, goToStage,
    aiStatus, aiContent, aiModel, streamAI,
  } = useSession()

  const researchSummary = str(session, "aiResearchSummary")
  const titleOptionsRaw = str(session, "aiTitleOptions")
  const episodeTitle = str(session, "episodeTitle")
  const podcastType = str(session, "podcastType")
  const tc = isTrueCrime(podcastType)
  const subjectLabel = tc ? str(session, "tcCaseOrPersonName") : str(session, "subject")

  const optionalLinks = arr(session, "optionalLinks")

  const [addSourceOpen, setAddSourceOpen] = useState(false)
  const [newSource, setNewSource] = useState("")
  const [titlesRequested, setTitlesRequested] = useState<boolean>(Boolean(titleOptionsRaw.trim()))

  const titles = useMemo(() => parseTitles(titleOptionsRaw), [titleOptionsRaw])

  // On mount, if we don't already have title options, request them.
  useEffect(() => {
    if (!titleOptionsRaw.trim() && !titlesRequested) {
      setTitlesRequested(true)
      void streamAI("titles", (content) => {
        if (content.trim()) setField("aiTitleOptions", content)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // If a titles stream just finished, persist the result.
  useEffect(() => {
    if (aiStatus === "done" && aiContent.trim() && !titleOptionsRaw.trim()) {
      setField("aiTitleOptions", aiContent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiStatus])

  const isGeneratingTitles = aiStatus === "loading" || aiStatus === "streaming"

  const handleUseTitle = useCallback(
    (title: string) => {
      setField("episodeTitle", title)
    },
    [setField]
  )

  const handleRequestMoreResearch = useCallback(() => {
    void goToStage(3)
  }, [goToStage])

  const handleRegenerateTitles = useCallback(() => {
    setField("aiTitleOptions", "")
    setTitlesRequested(true)
    void streamAI("titles", (content) => {
      if (content.trim()) setField("aiTitleOptions", content)
    })
  }, [setField, streamAI])

  const handleAddSource = () => {
    const trimmed = newSource.trim()
    if (!trimmed) return
    if (optionalLinks.includes(trimmed)) {
      setNewSource("")
      setAddSourceOpen(false)
      return
    }
    const next = [...optionalLinks, trimmed]
    setField("optionalLinks", next)
    setNewSource("")
    setAddSourceOpen(false)
  }

  return (
    <WizardPageLayout
      title="Research Review"
      description="Review the research and pick a title for your episode."
      footer={
        <>
          <Button variant="ghost" onClick={prevStep}>
            <ChevronLeft className="size-4" /> Edit Information
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRequestMoreResearch}>
              <RefreshCw className="size-4" /> Request More Research
            </Button>
            <Button onClick={nextStep} disabled={!researchSummary.trim()}>
              Approve & Continue <ChevronRight className="size-4" />
            </Button>
          </div>
        </>
      }
    >
      <div className="space-y-6">
        {/* Selected title display */}
        {episodeTitle.trim() && (
          <Card className="border-primary/30 bg-primary/5 shadow-sm">
            <CardContent className="flex items-center gap-3 pt-6">
              <CheckCircle2
                className="size-5 shrink-0"
                style={{ color: "hsl(var(--success))" }}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Selected Title
                </p>
                <p className="truncate text-base font-semibold text-foreground">
                  {episodeTitle}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subject chip */}
        {subjectLabel.trim() && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Episode:</span>
            <Badge variant="secondary" className="gap-1.5 py-1.5">
              {tc ? <Mic2 className="size-3" /> : <BookOpen className="size-3" />}
              <span className="max-w-full truncate">{subjectLabel}</span>
            </Badge>
          </div>
        )}

        {/* Research summary */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Research Summary</h3>
              </div>
              {aiModel && (
                <span className="text-xs text-muted-foreground">
                  via Together.AI · {aiModel}
                </span>
              )}
            </div>
            <Separator />
            <div className="mt-3 max-h-[45vh] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">
              {researchSummary.trim() ? (
                researchSummary
              ) : (
                <span className="italic text-muted-foreground">
                  No research summary available. Go back to run research first.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Title suggestions */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Title Suggestions</h3>
              </div>
              {titles.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerateTitles}
                  disabled={isGeneratingTitles}
                >
                  <RefreshCw className={cn("size-3.5", isGeneratingTitles && "animate-spin")} />
                  Regenerate
                </Button>
              )}
            </div>
            <Separator />

            {isGeneratingTitles && titles.length === 0 && (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                Generating title suggestions…
              </div>
            )}

            {!isGeneratingTitles && titles.length === 0 && (
              <div className="flex flex-col items-start gap-3 py-4">
                <p className="text-sm text-muted-foreground">
                  No title suggestions yet.
                </p>
                <Button variant="outline" size="sm" onClick={handleRegenerateTitles}>
                  <Sparkles className="size-3.5" /> Generate Titles
                </Button>
              </div>
            )}

            {titles.length > 0 && (
              <ul className="mt-3 space-y-2">
                {titles.map((title, idx) => {
                  const selected = episodeTitle.trim() === title
                  return (
                    <li
                      key={`${idx}-${title}`}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:bg-accent/40"
                      )}
                    >
                      <span className="text-sm font-medium text-foreground">{title}</span>
                      <Button
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        onClick={() => handleUseTitle(title)}
                        disabled={selected}
                        className="shrink-0"
                      >
                        {selected ? (
                          <>
                            <CheckCircle2 className="size-3.5" /> Selected
                          </>
                        ) : (
                          "Use This"
                        )}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Add source action */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium">Have another source?</p>
            <p className="text-xs text-muted-foreground">
              Add URLs to inform future research or drafts.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddSourceOpen(true)}>
            <Plus className="size-3.5" /> Add Source
          </Button>
        </div>

        {/* Current sources */}
        {optionalLinks.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Current Sources</Label>
            <div className="flex flex-wrap gap-1.5">
              {optionalLinks.map((l) => (
                <Badge key={l} variant="secondary" className="py-1.5">
                  <span className="max-w-[260px] truncate">{l}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Source dialog */}
      <Dialog open={addSourceOpen} onOpenChange={setAddSourceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Source</DialogTitle>
            <DialogDescription>
              Paste a URL you'd like the AI to consult for research or drafting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-source" className="text-sm font-medium">
              URL
            </Label>
            <Input
              id="new-source"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddSource()
                }
              }}
              placeholder="https://example.com/article"
              className="h-11"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddSourceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSource} disabled={!newSource.trim()}>
              Add Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WizardPageLayout>
  )
}
