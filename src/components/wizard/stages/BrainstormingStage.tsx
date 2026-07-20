import { useEffect, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Mic2,
} from "lucide-react"

import type { PodcastSession } from "@/types"
import {
  PODCAST_TYPES,
  PODCAST_SUB_TYPES,
  RUNTIME_OPTIONS,
  TONE_OPTIONS,
  CRIME_TYPES,
  CASE_STATUS_OPTIONS,
  isTrueCrime,
} from "@/types"
import { useSession } from "@/contexts/SessionContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WizardPageLayout } from "@/components/wizard/WizardPageLayout"

// Helper: read a string field from session data with a default.
function strField(session: PodcastSession | null, key: string): string {
  return ((session?.data[key] as string) || "")
}

function arrField(session: PodcastSession | null, key: string): string[] {
  const v = session?.data[key]
  return Array.isArray(v) ? (v as string[]) : []
}

export function BrainstormingStage() {
  const { session, setField, getField, nextStep, prevStep } = useSession()

  // Local state mirrors session.data; restored on mount and when session id changes.
  const [podcastType, setPodcastType] = useState<string>(strField(session, "podcastType"))
  const [podcastSubType, setPodcastSubType] = useState<string>(strField(session, "podcastSubType"))
  const [subject, setSubject] = useState<string>(strField(session, "subject"))
  const [runtime, setRuntime] = useState<string>(strField(session, "runtime"))
  const [tones, setTones] = useState<string[]>(arrField(session, "tones"))
  const [requiredInfo, setRequiredInfo] = useState<string>(strField(session, "requiredInfo"))
  const [excludedInfo, setExcludedInfo] = useState<string>(strField(session, "excludedInfo"))
  const [optionalLinks, setOptionalLinks] = useState<string[]>(arrField(session, "optionalLinks"))
  const [optionalNotes, setOptionalNotes] = useState<string>(strField(session, "optionalNotes"))

  // True Crime fields
  const [tcCaseOrPersonName, setTcCaseOrPersonName] = useState<string>(strField(session, "tcCaseOrPersonName"))
  const [tcCity, setTcCity] = useState<string>(strField(session, "tcCity"))
  const [tcState, setTcState] = useState<string>(strField(session, "tcState"))
  const [tcCountry, setTcCountry] = useState<string>(strField(session, "tcCountry") || "USA")
  const [tcCrimeType, setTcCrimeType] = useState<string>(strField(session, "tcCrimeType"))
  const [tcCaseStatus, setTcCaseStatus] = useState<string>(strField(session, "tcCaseStatus"))
  const [tcVictimName, setTcVictimName] = useState<string>(strField(session, "tcVictimName"))
  const [tcSuspectName, setTcSuspectName] = useState<string>(strField(session, "tcSuspectName"))
  const [tcDate, setTcDate] = useState<string>(strField(session, "tcDate"))
  const [tcAdditionalContext, setTcAdditionalContext] = useState<string>(strField(session, "tcAdditionalContext"))

  // Link input
  const [linkInput, setLinkInput] = useState<string>("")

  // Restore from session on mount / when session id changes.
  useEffect(() => {
    setPodcastType(strField(session, "podcastType"))
    setPodcastSubType(strField(session, "podcastSubType"))
    setSubject(strField(session, "subject"))
    setRuntime(strField(session, "runtime"))
    setTones(arrField(session, "tones"))
    setRequiredInfo(strField(session, "requiredInfo"))
    setExcludedInfo(strField(session, "excludedInfo"))
    setOptionalLinks(arrField(session, "optionalLinks"))
    setOptionalNotes(strField(session, "optionalNotes"))
    setTcCaseOrPersonName(strField(session, "tcCaseOrPersonName"))
    setTcCity(strField(session, "tcCity"))
    setTcState(strField(session, "tcState"))
    setTcCountry(strField(session, "tcCountry") || "USA")
    setTcCrimeType(strField(session, "tcCrimeType"))
    setTcCaseStatus(strField(session, "tcCaseStatus"))
    setTcVictimName(strField(session, "tcVictimName"))
    setTcSuspectName(strField(session, "tcSuspectName"))
    setTcDate(strField(session, "tcDate"))
    setTcAdditionalContext(strField(session, "tcAdditionalContext"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  const tc = isTrueCrime(podcastType)
  const subTypes = podcastType ? PODCAST_SUB_TYPES[podcastType] : undefined

  // When type changes, clear sub-type if it's no longer valid.
  useEffect(() => {
    if (podcastType && subTypes && !subTypes.includes(podcastSubType)) {
      setPodcastSubType("")
      setTimeout(() => setField("podcastSubType", ""), 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podcastType])

  const toggleTone = (tone: string) => {
    setTones((prev) => {
      let next: string[]
      if (prev.includes(tone)) {
        next = prev.filter((t) => t !== tone)
      } else {
        if (prev.length >= 4) return prev // max 4
        next = [...prev, tone]
      }
      setField("tones", next)
      return next
    })
  }

  const addLink = () => {
    const trimmed = linkInput.trim()
    if (!trimmed) return
    if (optionalLinks.includes(trimmed)) {
      setLinkInput("")
      return
    }
    const next = [...optionalLinks, trimmed]
    setOptionalLinks(next)
    setField("optionalLinks", next)
    setLinkInput("")
  }

  const removeLink = (link: string) => {
    const next = optionalLinks.filter((l) => l !== link)
    setOptionalLinks(next)
    setField("optionalLinks", next)
  }

  // Continue is disabled until required fields are set.
  const canContinue = (() => {
    if (!podcastType) return false
    if (!runtime) return false
    if (tc) {
      if (!tcCaseOrPersonName.trim()) return false
    } else {
      if (!subject.trim()) return false
    }
    return true
  })()

  const handleContinue = () => {
    if (!canContinue) return
    // Persist all fields before advancing.
    setField("podcastType", podcastType)
    setField("podcastSubType", podcastSubType)
    setField("subject", subject)
    setField("runtime", runtime)
    setField("tones", tones)
    setField("requiredInfo", requiredInfo)
    setField("excludedInfo", excludedInfo)
    setField("optionalLinks", optionalLinks)
    setField("optionalNotes", optionalNotes)
    if (tc) {
      setField("tcCaseOrPersonName", tcCaseOrPersonName)
      setField("tcCity", tcCity)
      setField("tcState", tcState)
      setField("tcCountry", tcCountry)
      setField("tcCrimeType", tcCrimeType)
      setField("tcCaseStatus", tcCaseStatus)
      setField("tcVictimName", tcVictimName)
      setField("tcSuspectName", tcSuspectName)
      setField("tcDate", tcDate)
      setField("tcAdditionalContext", tcAdditionalContext)
    }
    nextStep()
  }

  // Section 0 → Back disabled.
  const isSection0 = (session?.current_section ?? 0) === 0

  return (
    <WizardPageLayout
      title="Brainstorm"
      description="Tell us about your episode. The more detail you provide, the better the AI can help."
      footer={
        <>
          <Button variant="ghost" onClick={prevStep} disabled={isSection0}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <Button onClick={handleContinue} disabled={!canContinue}>
            Continue <ChevronRight className="size-4" />
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Podcast Type */}
        <div className="space-y-2">
          <Label htmlFor="podcast-type" className="text-sm font-medium">
            Podcast Type
          </Label>
          <Select
            value={podcastType}
            onValueChange={(v) => {
              setPodcastType(v)
              setField("podcastType", v)
            }}
          >
            <SelectTrigger id="podcast-type" className="h-11 w-full">
              <SelectValue placeholder="Select a podcast type" />
            </SelectTrigger>
            <SelectContent>
              {PODCAST_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sub-type (conditional) */}
        {podcastType && subTypes && subTypes.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="podcast-subtype" className="text-sm font-medium">
              Sub-type
            </Label>
            <Select
              value={podcastSubType}
              onValueChange={(v) => {
                setPodcastSubType(v)
                setField("podcastSubType", v)
              }}
            >
              <SelectTrigger id="podcast-subtype" className="h-11 w-full">
                <SelectValue placeholder="Select a sub-type" />
              </SelectTrigger>
              <SelectContent>
                {subTypes.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Subject OR True Crime intake */}
        {tc ? (
          <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Mic2 className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">True Crime Case Details</h3>
            </div>
            <Separator />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tc-case-name" className="text-sm font-medium">
                  Case or Person Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tc-case-name"
                  value={tcCaseOrPersonName}
                  onChange={(e) => {
                    setTcCaseOrPersonName(e.target.value)
                    setField("tcCaseOrPersonName", e.target.value)
                  }}
                  placeholder="e.g. The Disappearance of Jane Doe"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tc-city" className="text-sm font-medium">City</Label>
                <Input
                  id="tc-city"
                  value={tcCity}
                  onChange={(e) => {
                    setTcCity(e.target.value)
                    setField("tcCity", e.target.value)
                  }}
                  placeholder="e.g. Portland"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tc-state" className="text-sm font-medium">State</Label>
                <Input
                  id="tc-state"
                  value={tcState}
                  onChange={(e) => {
                    setTcState(e.target.value)
                    setField("tcState", e.target.value)
                  }}
                  placeholder="e.g. Oregon"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tc-country" className="text-sm font-medium">Country</Label>
                <Input
                  id="tc-country"
                  value={tcCountry}
                  onChange={(e) => {
                    setTcCountry(e.target.value)
                    setField("tcCountry", e.target.value)
                  }}
                  placeholder="USA"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tc-crime-type" className="text-sm font-medium">Crime Type</Label>
                <Select
                  value={tcCrimeType}
                  onValueChange={(v) => {
                    setTcCrimeType(v)
                    setField("tcCrimeType", v)
                  }}
                >
                  <SelectTrigger id="tc-crime-type" className="h-11 w-full">
                    <SelectValue placeholder="Select crime type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRIME_TYPES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tc-case-status" className="text-sm font-medium">Case Status</Label>
                <Select
                  value={tcCaseStatus}
                  onValueChange={(v) => {
                    setTcCaseStatus(v)
                    setField("tcCaseStatus", v)
                  }}
                >
                  <SelectTrigger id="tc-case-status" className="h-11 w-full">
                    <SelectValue placeholder="Select case status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tc-victim" className="text-sm font-medium">
                  Victim Name <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="tc-victim"
                  value={tcVictimName}
                  onChange={(e) => {
                    setTcVictimName(e.target.value)
                    setField("tcVictimName", e.target.value)
                  }}
                  placeholder="e.g. Jane Doe"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tc-suspect" className="text-sm font-medium">
                  Suspect / Perpetrator Name <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="tc-suspect"
                  value={tcSuspectName}
                  onChange={(e) => {
                    setTcSuspectName(e.target.value)
                    setField("tcSuspectName", e.target.value)
                  }}
                  placeholder="e.g. John Smith"
                  className="h-11"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tc-date" className="text-sm font-medium">Date / Date Range</Label>
                <Input
                  id="tc-date"
                  value={tcDate}
                  onChange={(e) => {
                    setTcDate(e.target.value)
                    setField("tcDate", e.target.value)
                  }}
                  placeholder="e.g. June 1995 or 1995-1998"
                  className="h-11"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tc-context" className="text-sm font-medium">Additional Context</Label>
                <Textarea
                  id="tc-context"
                  value={tcAdditionalContext}
                  onChange={(e) => {
                    setTcAdditionalContext(e.target.value)
                    setField("tcAdditionalContext", e.target.value)
                  }}
                  placeholder="Any other details about the case, investigation, or angle you want to explore…"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value)
                setField("subject", e.target.value)
              }}
              placeholder="What is this episode about?"
              className="h-11"
            />
          </div>
        )}

        {/* Target Runtime */}
        <div className="space-y-2">
          <Label htmlFor="runtime" className="text-sm font-medium">
            Target Runtime <span className="text-destructive">*</span>
          </Label>
          <Select
            value={runtime}
            onValueChange={(v) => {
              setRuntime(v)
              setField("runtime", v)
            }}
          >
            <SelectTrigger id="runtime" className="h-11 w-full">
              <SelectValue placeholder="Select target runtime" />
            </SelectTrigger>
            <SelectContent>
              {RUNTIME_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tone (multi-select chips) */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label className="text-sm font-medium">Tone</Label>
            <span className="text-xs text-muted-foreground">
              {tones.length}/4 selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((tone) => {
              const selected = tones.includes(tone)
              return (
                <button
                  key={tone}
                  type="button"
                  onClick={() => toggleTone(tone)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {tone}
                </button>
              )
            })}
          </div>
        </div>

        {/* Required Information */}
        <div className="space-y-2">
          <Label htmlFor="required-info" className="text-sm font-medium">
            Required Information
          </Label>
          <Textarea
            id="required-info"
            value={requiredInfo}
            onChange={(e) => {
              setRequiredInfo(e.target.value)
              setField("requiredInfo", e.target.value)
            }}
            placeholder="What must be included?"
            className="min-h-[100px]"
          />
        </div>

        {/* Excluded Information */}
        <div className="space-y-2">
          <Label htmlFor="excluded-info" className="text-sm font-medium">
            Excluded Information
          </Label>
          <Textarea
            id="excluded-info"
            value={excludedInfo}
            onChange={(e) => {
              setExcludedInfo(e.target.value)
              setField("excludedInfo", e.target.value)
            }}
            placeholder="What must be avoided?"
            className="min-h-[100px]"
          />
        </div>

        {/* Optional Links */}
        <div className="space-y-2">
          <Label htmlFor="link-input" className="text-sm font-medium">
            Optional Links
          </Label>
          <div className="flex gap-2">
            <Input
              id="link-input"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addLink()
                }
              }}
              placeholder="https://example.com/source"
              className="h-11"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addLink}
              disabled={!linkInput.trim()}
              className="h-11 shrink-0"
            >
              <Plus className="size-4" /> Add
            </Button>
          </div>
          {optionalLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {optionalLinks.map((link) => (
                <Badge
                  key={link}
                  variant="secondary"
                  className="gap-1.5 py-1.5 pl-3 pr-1.5"
                >
                  <span className="max-w-[260px] truncate">{link}</span>
                  <button
                    type="button"
                    onClick={() => removeLink(link)}
                    aria-label={`Remove ${link}`}
                    className="rounded-full p-0.5 hover:bg-background/60"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Optional Notes */}
        <div className="space-y-2">
          <Label htmlFor="optional-notes" className="text-sm font-medium">
            Optional Notes
          </Label>
          <Textarea
            id="optional-notes"
            value={optionalNotes}
            onChange={(e) => {
              setOptionalNotes(e.target.value)
              setField("optionalNotes", e.target.value)
            }}
            placeholder="Anything else you'd like the AI to know…"
            className="min-h-[100px]"
          />
        </div>
      </div>
    </WizardPageLayout>
  )
}
