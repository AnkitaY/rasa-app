import { ReactNode } from 'react'

type Tone = 'default' | 'accent' | 'success' | 'warn' | 'danger' | 'info' | 'muted'

const TONES: Record<Tone, string> = {
  default: 'bg-[#f2f4f7] text-[color:var(--ops-fg-muted)] border-[color:var(--ops-border)]',
  accent:  'bg-[color:var(--ops-accent-soft)] text-[color:var(--ops-accent)] border-[#d1e0ff]',
  success: 'bg-[color:var(--ops-success-soft)] text-[color:var(--ops-success)] border-[#abefc6]',
  warn:    'bg-[color:var(--ops-warn-soft)] text-[color:var(--ops-warn)] border-[#fedf89]',
  danger:  'bg-[color:var(--ops-danger-soft)] text-[color:var(--ops-danger)] border-[#fecdca]',
  info:    'bg-[color:var(--ops-info-soft)] text-[color:var(--ops-info)] border-[#b2ddff]',
  muted:   'bg-white text-[color:var(--ops-fg-soft)] border-[color:var(--ops-border)]',
}

export default function Badge({
  children, tone = 'default', mono = false,
}: { children: ReactNode; tone?: Tone; mono?: boolean }) {
  return (
    <span className={[
      'inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] leading-4 font-medium rounded border',
      mono ? 'ops-mono' : '',
      TONES[tone],
    ].join(' ')}>
      {children}
    </span>
  )
}

export function priorityTone(p: string | null | undefined): Tone {
  if (!p) return 'muted'
  if (p === 'HIGH') return 'danger'
  if (p === 'MED') return 'warn'
  if (p === 'LOW') return 'muted'
  if (p === 'PARKED') return 'info'
  return 'default'
}
