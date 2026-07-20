import { useMemo, useState } from "react"
import {
  ChevronLeft, Download, Copy, Printer, CheckCircle2, FileText, Mic2,
} from "lucide-react"

import { useSession } from "@/contexts/SessionContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { WizardPageLayout } from "@/components/wizard/WizardPageLayout"
import type { ProductionBlock } from "@/components/wizard/stages/ProductionBlockStage"

interface FinalReviewStageProps {
  onFinish: () => void
}

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function safeName(name: string): string {
  return (name || "podcast").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60)
}

export function FinalReviewStage({ onFinish }: FinalReviewStageProps) {
  const { session, prevStep, clearSession } = useSession()
  const [copied, setCopied] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const finalScript = ((session?.data.finalScript as string) || "").trim()
  const productionScript = ((session?.data.productionScript as string) || "").trim()
  const productionBlocks = (session?.data.productionBlocks as ProductionBlock[] | undefined) || []
  const episodeTitle = (session?.data.episodeTitle as string) || session?.project_name || "Untitled Episode"
  const podcastType = (session?.data.podcastType as string) || "—"
  const runtime = (session?.data.runtime as string) || "—"

  const finalWordCount = useMemo(() => countWords(finalScript), [finalScript])

  const productionText = useMemo(() => {
    if (productionBlocks.length > 0) {
      return productionBlocks
        .map((b) => {
          const header = `[BLOCK ${b.blockNumber}] ${b.segment || ""}${b.timing ? ` · ${b.timing}` : ""}`
          const meta = [
            b.speaker && `Speaker: ${b.speaker}`,
            b.musicCue && `Music: ${b.musicCue}`,
            b.soundCue && `SFX: ${b.soundCue}`,
            b.transition && `Transition: ${b.transition}`,
          ]
            .filter(Boolean)
            .join("\n")
          const notes = [
            b.editingNotes && `Editing notes: ${b.editingNotes}`,
            b.recordingNotes && `Recording notes: ${b.recordingNotes}`,
            b.sourceRef && `Source: ${b.sourceRef}`,
          ]
            .filter(Boolean)
            .join("\n")
          return [header, meta, b.content, notes].filter(Boolean).join("\n\n")
        })
        .join("\n\n---\n\n")
    }
    return productionScript
  }, [productionBlocks, productionScript])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalScript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }

  const handleFinish = () => {
    setIsComplete(true)
  }

  const handleStartNew = () => {
    clearSession()
    onFinish()
  }

  if (isComplete) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-4 pt-10 pb-10">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="size-10 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">Podcast script complete!</h2>
            <p className="text-sm text-muted-foreground">
              Your script for <span className="font-medium text-foreground">{episodeTitle}</span> is
              ready for production.
            </p>
            <Button onClick={handleStartNew} className="mt-2">
              Start New Podcast
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <WizardPageLayout
      title="Final Review & Export"
      description="Review your finished script and export it for production."
      footer={
        <>
          <Button variant="ghost" onClick={prevStep}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <Button onClick={handleFinish}>
            <CheckCircle2 className="size-4" /> Project Complete
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Episode info summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Title:</span>{" "}
                <span className="font-medium">{episodeTitle}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>{" "}
                <span className="font-medium">{podcastType}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Runtime:</span>{" "}
                <span className="font-medium">{runtime}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Words:</span>{" "}
                <span className="font-medium tabular-nums">{finalWordCount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadText(`${safeName(episodeTitle)}_script.txt`, finalScript)}
            disabled={!finalScript}
          >
            <Download className="size-4" /> Download TXT
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadText(`${safeName(episodeTitle)}_production.txt`, productionText)}
            disabled={!productionText}
          >
            <Download className="size-4" /> Download Production TXT
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={!finalScript}>
            <Copy className="size-4" /> {copied ? "Copied!" : "Copy to Clipboard"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="final" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="final">
              <FileText className="size-4" /> Final Script
            </TabsTrigger>
            <TabsTrigger value="production">
              <Mic2 className="size-4" /> Production Script
            </TabsTrigger>
          </TabsList>

          <TabsContent value="final" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {finalScript ? (
                  <>
                    <h3 className="script-editor mb-4 text-center text-lg font-semibold">
                      {episodeTitle}
                    </h3>
                    <Separator className="mb-4" />
                    <div className="script-editor whitespace-pre-wrap text-base">
                      {finalScript}
                    </div>
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No final script available.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="production" className="mt-4">
            {productionBlocks.length > 0 ? (
              <div className="space-y-3">
                {productionBlocks.map((block) => (
                  <Card key={block.id}>
                    <CardContent className="pt-5">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">#{block.blockNumber}</Badge>
                        {block.segment && (
                          <span className="text-sm font-medium">{block.segment}</span>
                        )}
                        {block.timing && (
                          <Badge variant="outline" className="text-xs">
                            {block.timing}
                          </Badge>
                        )}
                        {block.speaker && (
                          <Badge variant="outline" className="text-xs">
                            {block.speaker}
                          </Badge>
                        )}
                      </div>
                      {block.content && (
                        <div className="script-editor whitespace-pre-wrap text-sm">
                          {block.content}
                        </div>
                      )}
                      {(block.musicCue || block.soundCue || block.transition) && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 text-xs text-muted-foreground">
                          {block.musicCue && <span>🎵 {block.musicCue}</span>}
                          {block.soundCue && <span>🔊 {block.soundCue}</span>}
                          {block.transition && <span>⇢ {block.transition}</span>}
                        </div>
                      )}
                      {(block.editingNotes || block.recordingNotes) && (
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {block.editingNotes && <p>Editing: {block.editingNotes}</p>}
                          {block.recordingNotes && <p>Recording: {block.recordingNotes}</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : productionScript ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="script-editor whitespace-pre-wrap text-sm">
                    {productionScript}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No production script available.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </WizardPageLayout>
  )
}
