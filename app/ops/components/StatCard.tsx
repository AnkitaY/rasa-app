import { ReactNode } from 'react'

export default function StatCard({
  label, value, hint, tone = 'default', icon,
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'default' | 'danger' | 'warn' | 'success' | 'accent'
  icon?: ReactNode
}) {
  const accentColor = {
    default: 'var(--ops-fg)',
    danger:  'var(--ops-danger)',
    warn:    'var(--ops-warn)',
    success: 'var(--ops-success)',
    accent:  'var(--ops-accent)',
  }[tone]

  return (
    <div className="ops-card px-5 py-4">
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.06em] text-[color:var(--ops-fg-soft)]">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-[26px] font-semibold tabular-nums tracking-tight" style={{ color: accentColor }}>
          {value}
        </div>
      </div>
      {hint && <div className="mt-1 text-[12px] text-[color:var(--ops-fg-muted)]">{hint}</div>}
    </div>
  )
}
