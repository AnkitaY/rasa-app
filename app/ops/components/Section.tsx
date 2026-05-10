import { ReactNode } from 'react'

export default function Section({
  title, count, action, children, tone = 'default',
}: {
  title: string
  count?: number
  action?: ReactNode
  children: ReactNode
  tone?: 'default' | 'danger' | 'warn' | 'accent'
}) {
  const titleColor = {
    default: 'var(--ops-fg)',
    danger:  'var(--ops-danger)',
    warn:    'var(--ops-warn)',
    accent:  'var(--ops-accent)',
  }[tone]
  return (
    <section className="ops-card overflow-hidden">
      <header className="px-4 py-3 border-b border-[color:var(--ops-border)] flex items-center justify-between bg-[#fafbfc]">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold tracking-tight" style={{ color: titleColor }}>
            {title}
          </h2>
          {typeof count === 'number' && (
            <span className="text-[11px] tabular-nums px-1.5 py-0.5 rounded bg-white border border-[color:var(--ops-border)] text-[color:var(--ops-fg-soft)]">
              {count}
            </span>
          )}
        </div>
        {action}
      </header>
      <div>{children}</div>
    </section>
  )
}
