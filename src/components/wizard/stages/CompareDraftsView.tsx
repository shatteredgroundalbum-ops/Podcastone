import { useState } from "react"
import { ChevronLeft, Check } from "lucide-react"

import { useSession } from "@/contexts/SessionContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { WizardPageLayout } from "@/components/wizard/WizardPageLayout"

interface CompareDraftsViewProps {
  onBack: () => void
}

export function CompareDraftsView({ onBack }: CompareDraftsViewProps) {
  const { session, setField, nextStep } = useSession()
  const draft1 = ((session?.data.draft1Script as string) || "").trim()
  const draft2 = ((session?.data.draft2Script as string) || "").trim()
  const [activeTab, setActiveTab] = useState<"d1" | "d2">("d2")

  const keepDraft = (which: 1 | 2) => {
    const chosen = which === 1 ? draft1 : draft2
    setField("finalBaseScript", chosen)
    nextStep()
  }

  const renderPane = (title: string, content: string, which: 1 | 2) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">{title}</span>
        <Button size="sm" variant="outline" onClick={() => keepDraft(which)}>
          <Check className="size-3.5" /> Keep as Final
        </Button>
      </div>
      <div className="script-editor flex-1 overflow-y-auto whitespace-pre-wrap p-4 text-sm">
        {content || <span className="text-muted-foreground italic">No content</span>}
      </div>
    </div>
  )

  return (
    <WizardPageLayout
      title="Compare Drafts"
      description="Review Draft 1 and Draft 2 side by side, then choose which to carry forward."
      footer={
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="size-4" /> Back to Draft 2
        </Button>
      }
    >
      {/* Desktop split view */}
      <div className="hidden gap-4 md:grid md:grid-cols-2">
        <div className="h-[60vh] overflow-hidden rounded-lg border bg-card">
          {renderPane("Draft 1", draft1, 1)}
        </div>
        <div className="h-[60vh] overflow-hidden rounded-lg border bg-card">
          {renderPane("Draft 2", draft2, 2)}
        </div>
      </div>

      {/* Mobile tabbed view */}
      <div className="md:hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "d1" | "d2")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="d1">Draft 1</TabsTrigger>
            <TabsTrigger value="d2">Draft 2</TabsTrigger>
          </TabsList>
          <TabsContent value="d1">
            <div className="h-[60vh] overflow-hidden rounded-lg border bg-card">
              {renderPane("Draft 1", draft1, 1)}
            </div>
          </TabsContent>
          <TabsContent value="d2">
            <div className="h-[60vh] overflow-hidden rounded-lg border bg-card">
              {renderPane("Draft 2", draft2, 2)}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => keepDraft(1)} disabled={!draft1}>
          Keep Draft 1 as Final
        </Button>
        <Button onClick={() => keepDraft(2)} disabled={!draft2}>
          Keep Draft 2 as Final
        </Button>
      </div>
    </WizardPageLayout>
  )
}
