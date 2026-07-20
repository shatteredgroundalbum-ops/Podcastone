import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronLeft, ChevronRight, Loader2, Sparkles,
  Plus, Trash2, Copy, ChevronUp, ChevronDown, GripVertical,
} from "lucide-react"

import { useSession } from "@/contexts/SessionContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { WizardPageLayout } from "@/components/wizard/WizardPageLayout"

export interface ProductionBlock {
  id: string
  blockNumber: number
  segment: string
  speaker: string
  timing: string
  content: string
  musicCue: string
  soundCue: string
  transition: string
  editingNotes: string
  recordingNotes: string
  sourceRef: string
}

function makeId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function emptyBlock(blockNumber: number): ProductionBlock {
  return {
    id: makeId(),
    blockNumber,
    segment: "",
    speaker: "",
    timing: "",
    content: "",
    musicCue: "",
    soundCue: "",
    transition: "",
    editingNotes: "",
    recordingNotes: "",
    sourceRef: "",
  }
}

/**
 * Parse raw AI production text into blocks. Splits on `[BLOCK` markers first,
 * then falls back to double newlines. Keeps parsing forgiving.
 */
function parseProductionScript(raw: string): ProductionBlock[] {
  const text = raw.trim()
  if (!text) return []

  // Try [BLOCK N] style markers.
  const blockMarkerRegex = /\[BLOCK[^\]]*\]/i
  if (blockMarkerRegex.test(text)) {
    const parts = text.split(blockMarkerRegex).filter((p) => p.trim().length > 0)
    return parts.map((part, idx) => {
      const lines = part.split("\n").map((l) => l.trim()).filter(Boolean)
      const block = emptyBlock(idx + 1)
      // First non-empty line is the segment/title.
      if (lines.length > 0) block.segment = lines[0].replace(/^[-—:\s]+/, "")
      block.content = part.trim()
      return block
    })
  }

  // Fallback: split on double newlines.
  const sections = text.split(/\n\s*\n/).filter((s) => s.trim().length > 0)
  if (sections.length === 0) {
    const block = emptyBlock(1)
    block.content = text
    return [block]
  }
  return sections.map((section, idx) => {
    const block = emptyBlock(idx + 1)
    const firstLine = section.split("\n")[0]?.trim() || ""
    block.segment = firstLine.replace(/^[-—:\s]+/, "").slice(0, 80)
    block.content = section.trim()
    return block
  })
}

export function ProductionBlockStage() {
  const {
    session, setField, getField, nextStep, prevStep,
    aiStatus, aiContent, aiModel, streamAI, cancelAI,
  } = useSession()

  const rawScript = (getField("productionScript") as string) || ""
  const storedBlocks = (getField("productionBlocks") as ProductionBlock[] | undefined) || undefined

  const [blocks, setBlocks] = useState<ProductionBlock[]>(() => {
    if (storedBlocks && storedBlocks.length > 0) return storedBlocks
    if (rawScript) return parseProductionScript(rawScript)
    return []
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [streamedText, setStreamedText] = useState<string>("")

  const isStreaming = aiStatus === "streaming" || aiStatus === "loading"

  // Persist blocks whenever they change.
  useEffect(() => {
    setField("productionBlocks", blocks)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks])

  const handleGenerate = useCallback(() => {
    setField("productionScript", "")
    setBlocks([])
    setStreamedText("")
    streamAI("production", (content) => {
      setField("productionScript", content)
      const parsed = parseProductionScript(content)
      setBlocks(parsed)
      // Expand the first block by default.
      if (parsed.length > 0) {
        setExpanded({ [parsed[0].id]: true })
      }
    })
  }, [setField, streamAI])

  const handleCancel = useCallback(() => {
    cancelAI()
    if (aiContent) {
      setField("productionScript", aiContent)
      setBlocks(parseProductionScript(aiContent))
    }
  }, [aiContent, cancelAI, setField])

  // Track streaming text for live preview.
  useEffect(() => {
    if (isStreaming) setStreamedText(aiContent)
  }, [isStreaming, aiContent])

  const updateBlock = useCallback((id: string, patch: Partial<ProductionBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }, [])

  const addBlock = useCallback(() => {
    setBlocks((prev) => {
      const next = emptyBlock(prev.length + 1)
      setExpanded((e) => ({ ...e, [next.id]: true }))
      return [...prev, next]
    })
  }, [])

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const duplicateBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      if (idx === -1) return prev
      const copy: ProductionBlock = { ...prev[idx], id: makeId() }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next.map((b, i) => ({ ...b, blockNumber: i + 1 }))
    })
  }, [])

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      if (idx === -1) return prev
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(idx, 1)
      next.splice(target, 0, moved)
      return next.map((b, i) => ({ ...b, blockNumber: i + 1 }))
    })
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }))
  }, [])

  const hasBlocks = blocks.length > 0
  const totalContentWords = useMemo(
    () => blocks.reduce((sum, b) => sum + (b.content.trim() ? b.content.trim().split(/\s+/).length : 0), 0),
    [blocks]
  )

  return (
    <WizardPageLayout
      title="Production Blocks"
      description="Break the script into production-ready blocks with cues and notes."
      footer={
        <>
          <Button variant="ghost" onClick={prevStep}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setField("productionBlocks", blocks)}
              disabled={!hasBlocks}
            >
              Save
            </Button>
            <Button onClick={nextStep} disabled={!hasBlocks || isStreaming}>
              Finalize Production Script <ChevronRight className="size-4" />
            </Button>
          </div>
        </>
      }
    >
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Blocks:</span>{" "}
            <span className="font-medium tabular-nums">{blocks.length}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Words:</span>{" "}
            <span className="font-medium tabular-nums">{totalContentWords.toLocaleString()}</span>
          </div>
          {isStreaming && (
            <Badge variant="secondary" className="ml-auto gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              Generating with {aiModel || "AI"}…
            </Badge>
          )}
        </div>

        {/* Generate card */}
        {!hasBlocks && !isStreaming && (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 pt-6">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h3 className="text-base font-medium">Generate Production Script</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                We'll break the final script into timed production blocks with speaker, music, and
                sound cues.
              </p>
              <Button onClick={handleGenerate}>
                <Sparkles className="size-4" /> Generate Production Script
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Streaming preview */}
        {isStreaming && (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
              <span className="text-sm text-primary">Streaming production script…</span>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Stop
              </Button>
            </div>
            <pre className="script-editor streaming-cursor max-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-md border bg-background p-4 text-sm">
              {streamedText || "…"}
            </pre>
          </div>
        )}

        {/* Block toolbar */}
        {hasBlocks && !isStreaming && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {blocks.length} block{blocks.length === 1 ? "" : "s"}
            </span>
            <Button size="sm" variant="outline" onClick={addBlock}>
              <Plus className="size-4" /> Add Block
            </Button>
          </div>
        )}

        {/* Block list */}
        {hasBlocks && !isStreaming && (
          <div className="space-y-3">
            {blocks.map((block, idx) => {
              const isOpen = expanded[block.id] ?? idx === 0
              return (
                <Card key={block.id}>
                  <CardHeader className="py-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                      <button
                        type="button"
                        onClick={() => toggleExpand(block.id)}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <span className="font-medium">#{block.blockNumber}</span>
                        {block.segment && (
                          <span className="text-sm text-muted-foreground">
                            — {block.segment}
                          </span>
                        )}
                        {block.timing && (
                          <Badge variant="outline" className="ml-1 text-xs">
                            {block.timing}
                          </Badge>
                        )}
                      </button>
                      <div className="flex items-center gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => moveBlock(block.id, -1)}
                          disabled={idx === 0}
                          aria-label="Move up"
                        >
                          <ChevronUp className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => moveBlock(block.id, 1)}
                          disabled={idx === blocks.length - 1}
                          aria-label="Move down"
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => duplicateBlock(block.id)}
                          aria-label="Duplicate"
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => deleteBlock(block.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => toggleExpand(block.id)}
                          aria-label={isOpen ? "Collapse" : "Expand"}
                        >
                          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {isOpen && (
                    <CardContent className="space-y-4 pt-0">
                      <Separator />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Segment</Label>
                          <Input
                            value={block.segment}
                            onChange={(e) => updateBlock(block.id, { segment: e.target.value })}
                            placeholder="Intro, Segment A, Ad Read…"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Speaker</Label>
                          <Input
                            value={block.speaker}
                            onChange={(e) => updateBlock(block.id, { speaker: e.target.value })}
                            placeholder="Host, Guest, Narrator…"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Timing</Label>
                          <Input
                            value={block.timing}
                            onChange={(e) => updateBlock(block.id, { timing: e.target.value })}
                            placeholder="00:00–01:30"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Source Ref</Label>
                          <Input
                            value={block.sourceRef}
                            onChange={(e) => updateBlock(block.id, { sourceRef: e.target.value })}
                            placeholder="Research §2, Draft 1 ¶3…"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Content</Label>
                        <Textarea
                          value={block.content}
                          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                          className="script-editor min-h-[160px] resize-y"
                          placeholder="Scripted lines for this block…"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Music Cue</Label>
                          <Input
                            value={block.musicCue}
                            onChange={(e) => updateBlock(block.id, { musicCue: e.target.value })}
                            placeholder="Theme in, fade under…"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Sound Cue</Label>
                          <Input
                            value={block.soundCue}
                            onChange={(e) => updateBlock(block.id, { soundCue: e.target.value })}
                            placeholder="SFX: door slam…"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Transition</Label>
                          <Input
                            value={block.transition}
                            onChange={(e) => updateBlock(block.id, { transition: e.target.value })}
                            placeholder="Crossfade, hard cut…"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Recording Notes</Label>
                          <Input
                            value={block.recordingNotes}
                            onChange={(e) => updateBlock(block.id, { recordingNotes: e.target.value })}
                            placeholder="Mic, take direction…"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Editing Notes</Label>
                        <Textarea
                          value={block.editingNotes}
                          onChange={(e) => updateBlock(block.id, { editingNotes: e.target.value })}
                          className="min-h-[80px] resize-y"
                          placeholder="Trim pauses, level match…"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </WizardPageLayout>
  )
}
