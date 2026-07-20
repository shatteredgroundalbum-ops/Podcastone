import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Mic2,
  FlaskConical,
  Link2,
  StickyNote,
} from "lucide-react"

import type { PodcastSession } from "@/types"
import { isTrueCrime } from "@/types"
import { useSession } from "@/contexts/SessionContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { WizardPageLayout } from "@/components/wizard/WizardPageLayout"

function str(session: PodcastSession | null, key: string): string {
  const v = session?.data[key]
  return typeof v === "string" ? v : ""
}

function arr(session: PodcastSession | null, key: string): string[] {
  const v = session?.data[key]
  return Array.isArray(v) ? (v as string[]) : []
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4 sm:py-3">
      <dt className="w-40 shrink-0 text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground break-words">
        {value.trim() ? value : <span className="italic text-muted-foreground/70">Not specified</span>}
      </dd>
    </div>
  )
}

function GroupCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <Separator />
        <dl className="divide-y divide-border/60">{children}</dl>
      </CardContent>
    </Card>
  )
}

export function IntakeReviewStage() {
  const { session, nextStep, prevStep } = useSession()

  const podcastType = str(session, "podcastType")
  const podcastSubType = str(session, "podcastSubType")
  const runtime = str(session, "runtime")
  const subject = str(session, "subject")
  const tones = arr(session, "tones")
  const requiredInfo = str(session, "requiredInfo")
  const excludedInfo = str(session, "excludedInfo")
  const optionalLinks = arr(session, "optionalLinks")
  const optionalNotes = str(session, "optionalNotes")

  const tc = isTrueCrime(podcastType)

  const tcCaseOrPersonName = str(session, "tcCaseOrPersonName")
  const tcCity = str(session, "tcCity")
  const tcState = str(session, "tcState")
  const tcCountry = str(session, "tcCountry")
  const tcCrimeType = str(session, "tcCrimeType")
  const tcCaseStatus = str(session, "tcCaseStatus")
  const tcVictimName = str(session, "tcVictimName")
  const tcSuspectName = str(session, "tcSuspectName")
  const tcDate = str(session, "tcDate")
  const tcAdditionalContext = str(session, "tcAdditionalContext")

  return (
    <WizardPageLayout
      title="Intake Review"
      description="Review everything you entered before we begin research."
      footer={
        <>
          <Button variant="ghost" onClick={prevStep}>
            <ChevronLeft className="size-4" /> Edit Information
          </Button>
          <Button onClick={nextStep}>
            Begin Research <ChevronRight className="size-4" />
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Episode Info */}
        <GroupCard icon={<BookOpen className="size-4" />} title="Episode Info">
          <Row label="Type" value={podcastType} />
          {podcastSubType && <Row label="Sub-type" value={podcastSubType} />}
          <Row label="Runtime" value={runtime} />
        </GroupCard>

        {/* Subject / True Crime */}
        <GroupCard
          icon={tc ? <Mic2 className="size-4" /> : <BookOpen className="size-4" />}
          title={tc ? "True Crime Case" : "Subject"}
        >
          {tc ? (
            <>
              <Row label="Case / Person" value={tcCaseOrPersonName} />
              <Row label="City" value={tcCity} />
              <Row label="State" value={tcState} />
              <Row label="Country" value={tcCountry} />
              <Row label="Crime Type" value={tcCrimeType} />
              <Row label="Case Status" value={tcCaseStatus} />
              <Row label="Victim" value={tcVictimName} />
              <Row label="Suspect" value={tcSuspectName} />
              <Row label="Date" value={tcDate} />
              <Row label="Additional Context" value={tcAdditionalContext} />
            </>
          ) : (
            <Row label="Subject" value={subject} />
          )}
        </GroupCard>

        {/* Tone & Direction */}
        <GroupCard icon={<FlaskConical className="size-4" />} title="Tone & Direction">
          <div className="py-2 sm:py-3">
            <dt className="mb-2 w-40 shrink-0 text-sm font-medium text-muted-foreground">Tones</dt>
            <dd className="flex flex-wrap gap-2">
              {tones.length > 0 ? (
                tones.map((t) => (
                  <Badge key={t} variant="default">{t}</Badge>
                ))
              ) : (
                <span className="text-sm italic text-muted-foreground/70">Not specified</span>
              )}
            </dd>
          </div>
          <Separator />
          <Row label="Required Info" value={requiredInfo} />
          <Separator />
          <Row label="Excluded Info" value={excludedInfo} />
        </GroupCard>

        {/* Links & Notes */}
        <GroupCard icon={<Link2 className="size-4" />} title="Links & Notes">
          <div className="py-2 sm:py-3">
            <dt className="mb-2 w-40 shrink-0 text-sm font-medium text-muted-foreground">Optional Links</dt>
            <dd className="flex flex-col gap-1.5">
              {optionalLinks.length > 0 ? (
                optionalLinks.map((l) => (
                  <a
                    key={l}
                    href={l}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline-offset-2 hover:underline break-all"
                  >
                    {l}
                  </a>
                ))
              ) : (
                <span className="text-sm italic text-muted-foreground/70">None provided</span>
              )}
            </dd>
          </div>
          <Separator />
          <div className="py-2 sm:py-3">
            <dt className="mb-1 w-40 shrink-0 text-sm font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <StickyNote className="size-3.5" /> Optional Notes
              </span>
            </dt>
            <dd className="text-sm text-foreground whitespace-pre-wrap break-words">
              {optionalNotes.trim() ? (
                optionalNotes
              ) : (
                <span className="italic text-muted-foreground/70">None provided</span>
              )}
            </dd>
          </div>
        </GroupCard>
      </div>
    </WizardPageLayout>
  )
}
