import type { ReactNode } from "react"

interface WizardPageLayoutProps {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

export function WizardPageLayout({ title, description, children, footer }: WizardPageLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="px-6 pt-6 pb-4">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </div>
      {footer && (
        <footer className="sticky bottom-0 border-t bg-background px-6 py-4">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
            {footer}
          </div>
        </footer>
      )}
    </div>
  )
}
