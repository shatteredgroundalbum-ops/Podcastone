import { useCallback } from "react"
import { ChevronLeft, ChevronRight, Home, Podcast } from "lucide-react"

import { useSession } from "@/contexts/SessionContext"
import { STAGE_NAMES, TOTAL_STEPS, getStepNumber } from "@/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BrainstormingStage } from "@/components/wizard/stages/BrainstormingStage"
import { IntakeReviewStage } from "@/components/wizard/stages/IntakeReviewStage"
import { ResearchStage } from "@/components/wizard/stages/ResearchStage"
import { ResearchReviewStage } from "@/components/wizard/stages/ResearchReviewStage"
import { DraftStage } from "@/components/wizard/stages/DraftStage"
import { FinalPolishStage } from "@/components/wizard/stages/FinalPolishStage"
import { FinalReviewStage } from "@/components/wizard/stages/FinalReviewStage"
import { ProductionBlockStage } from "@/components/wizard/stages/ProductionBlockStage"

interface WizardProps {
  onExit: () => void
}

export function Wizard({ onExit }: WizardProps) {
  const { session, prevStep, nextStep, clearSession } = useSession()

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No session loaded.</p>
      </div>
    )
  }

  const stage = session.current_stage
  const section = session.current_section || 0
  const currentStep = getStepNumber(stage, section)

  const handleFinish = useCallback(() => {
    clearSession()
    onExit()
  }, [clearSession, onExit])

  // Render the stage content
  const renderStage = () => {
    switch (stage) {
      case 1:
        return <BrainstormingStage />
      case 2:
        return <IntakeReviewStage />
      case 3:
        return <ResearchStage />
      case 4:
        return <ResearchReviewStage />
      case 5:
        return <DraftStage draftNum={1} />
      case 6:
        return <DraftReviewStage draftNum={1} />
      case 7:
        return <DraftStage draftNum={2} />
      case 8:
        return <DraftReviewStage draftNum={2} />
      case 9:
        return <FinalPolishStage />
      case 10:
        return <FinalReviewStage onFinish={handleFinish} />
      case 11:
        return <ProductionBlockStage />
      case 12:
        return <ExportStage />
      default:
        return (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Unknown stage: {stage}</p>
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Progress bar */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Projects</span>
          </button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm">
            <Podcast className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground truncate max-w-[180px]">
              {session.project_name}
            </span>
            <span className="text-muted-foreground">
              Step {Math.min(currentStep, TOTAL_STEPS)}/{TOTAL_STEPS}
            </span>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => {
              const step = getStepNumber(s, 0)
              const isDone = s < stage
              const isActive = s === stage
              return (
                <div
                  key={s}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors",
                    isDone && "stage-pill-done",
                    isActive && "stage-pill-active",
                    !isDone && !isActive && "stage-pill-future"
                  )}
                  title={STAGE_NAMES[s]}
                >
                  {s}
                </div>
              )
            })}
          </div>
        </div>
      </header>

      {/* Stage content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full stage-enter" key={`stage-${stage}-${section}`}>
          {renderStage()}
        </div>
      </main>
    </div>
  )
}

// ── Draft Review Stage (stages 6 & 8) ────────────────────────────────────
function DraftReviewStage({ draftNum }: { draftNum: 1 | 2 }) {
  const { session, setField, getField, nextStep, prevStep } = useSession()
  const scriptKey = `draft${draftNum}Script` as const
  const feedbackKey = `draft${draftNum}Feedback` as const
  const script = (getField(scriptKey) as string) || ""
  const feedback = (getField(feedbackKey) as string) || ""

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Review Draft {draftNum}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review the script and add feedback before moving to the next stage.
            </p>
          </div>

          {/* Script preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Script</label>
            <div className="rounded-lg border bg-card p-4 script-editor text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
              {script || "No script generated yet."}
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor={`feedback-${draftNum}`}>
              Your Feedback
            </label>
            <textarea
              id={`feedback-${draftNum}`}
              className="flex min-h-[120px] w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="What worked well? What needs improvement? Any specific changes you'd like in the next draft..."
              value={feedback}
              onChange={(e) => {
                setField(feedbackKey, e.target.value)
              }}
            />
          </div>
        </div>
      </div>
      <footer className="sticky bottom-0 border-t bg-background px-6 py-4">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <Button variant="ghost" onClick={prevStep}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <Button onClick={nextStep}>
            Continue <ChevronRight className="size-4" />
          </Button>
        </div>
      </footer>
    </div>
  )
}

// ── Export Stage (stage 12) ──────────────────────────────────────────────
function ExportStage() {
  const { session, prevStep, clearSession } = useSession()

  const finalScript = ((session?.data.finalScript as string) || "").trim()
  const productionScript = ((session?.data.productionScript as string) || "").trim()
  const episodeTitle = (session?.data.episodeTitle as string) || session?.project_name || "Untitled Episode"

  const handleDownload = (content: string, label: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${safeName(episodeTitle)}_${label}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFinish = () => {
    clearSession()
    window.location.reload()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Export</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your podcast script is ready. Download your files or start a new project.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => handleDownload(finalScript, "final_script")}
              className="rounded-xl border bg-card p-6 text-left hover:border-primary/50 transition-colors group"
            >
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                Final Script
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                The polished, production-ready script.
              </p>
            </button>
            {productionScript && (
              <button
                onClick={() => handleDownload(productionScript, "production_blocks")}
                className="rounded-xl border bg-card p-6 text-left hover:border-primary/50 transition-colors group"
              >
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                  Production Blocks
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Segmented script with production notes.
                </p>
              </button>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">Preview: {episodeTitle}</h3>
            <div className="script-editor text-sm leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto text-muted-foreground">
              {finalScript.slice(0, 2000)}{finalScript.length > 2000 ? "..." : ""}
            </div>
          </div>
        </div>
      </div>
      <footer className="sticky bottom-0 border-t bg-background px-6 py-4">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <Button variant="ghost" onClick={prevStep}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <Button onClick={handleFinish}>
            Start New Project <ChevronRight className="size-4" />
          </Button>
        </div>
      </footer>
    </div>
  )
}

function safeName(name: string): string {
  return (name || "podcast").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60)
}