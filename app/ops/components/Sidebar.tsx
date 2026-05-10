'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, ListChecks, GitBranch,
  AlertOctagon, ScrollText, Send,
} from 'lucide-react'

const NAV = [
  { href: '/ops',          label: 'Overview',  Icon: LayoutDashboard, exact: true },
  { href: '/ops/dispatch', label: 'Dispatch',  Icon: Send },
  { href: '/ops/agents',   label: 'Agents',    Icon: Users },
  { href: '/ops/tasks',    label: 'Tasks',     Icon: ListChecks },
  { href: '/ops/threads',  label: 'Threads',   Icon: GitBranch },
  { href: '/ops/founder',  label: 'Decisions', Icon: AlertOctagon },
  { href: '/ops/log',      label: 'Activity',  Icon: ScrollText },
]

export default function Sidebar({ stats }: { stats: { needsFounder: number; openTasks: number } }) {
  const pathname = usePathname()
  return (
    <aside className="w-60 shrink-0 border-r border-[color:var(--ops-border)] bg-white flex flex-col">
      <div className="px-5 py-5 border-b border-[color:var(--ops-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[color:var(--ops-fg)] text-white flex items-center justify-center text-[11px] font-semibold tracking-tight">
            R
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold tracking-tight text-[color:var(--ops-fg)]">Rasa Ops</div>
            <div className="text-[11px] text-[color:var(--ops-fg-soft)]">Internal console</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
          const badge =
            href === '/ops/founder' && stats.needsFounder > 0 ? stats.needsFounder :
            href === '/ops/tasks'   && stats.openTasks   > 0 ? stats.openTasks   :
            null
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] transition-colors',
                active
                  ? 'bg-[color:var(--ops-accent-soft)] text-[color:var(--ops-accent)] font-medium'
                  : 'text-[color:var(--ops-fg-muted)] hover:bg-[#f2f4f7] hover:text-[color:var(--ops-fg)]',
              ].join(' ')}
            >
              <Icon className="w-4 h-4 stroke-[1.75]" />
              <span className="flex-1">{label}</span>
              {badge !== null && (
                <span className={[
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium tabular-nums',
                  active ? 'bg-white text-[color:var(--ops-accent)]' : 'bg-[#f2f4f7] text-[color:var(--ops-fg-muted)]',
                ].join(' ')}>
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t border-[color:var(--ops-border)] text-[11px] text-[color:var(--ops-fg-soft)] leading-relaxed">
        <div className="flex items-center justify-between">
          <span>Phase 1 · S01</span>
          <span className="ops-mono">localhost</span>
        </div>
        <div className="mt-1">Read-only dashboard. Source files in <span className="ops-mono">ops/</span>.</div>
      </div>
    </aside>
  )
}
