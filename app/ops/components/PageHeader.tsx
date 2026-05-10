import { ReactNode } from 'react'

export default function PageHeader({
  title, eyebrow, description, actions,
}: {
  title: string
  eyebrow?: ReactNode
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="px-8 pt-8 pb-6 border-b border-[color:var(--ops-border)] bg-white">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--ops-fg-soft)]">
              {eyebrow}
            </div>
          )}
          <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight text-[color:var(--ops-fg)]">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-[13px] text-[color:var(--ops-fg-muted)] max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
