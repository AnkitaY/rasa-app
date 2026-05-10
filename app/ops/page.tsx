import Link from 'next/link'
import { loadOverview } from '@/lib/ops/parsers'
import PageHeader from './components/PageHeader'
import StatCard from './components/StatCard'
import Section from './components/Section'
import Badge from './components/Badge'
import EmptyState from './components/EmptyState'
import {
  Activity, AlertTriangle, Clock, Users, ListChecks, Inbox,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function OpsOverviewPage() {
  const o = await loadOverview()

  return (
    <>
      <PageHeader
        eyebrow={`Sprint ${o.sprint.id ?? ''}`}
        title="Operations overview"
        description={o.sprint.goal ?? undefined}
        actions={
          o.sprint.dates && (
            <span className="ops-mono text-[11px] text-[color:var(--ops-fg-soft)] px-2 py-1 rounded border border-[color:var(--ops-border)] bg-white">
              {o.sprint.dates}
            </span>
          )
        }
      />

      <div className="px-8 py-6 space-y-6">
        {/* Top metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Open tasks" value={o.counts.openTasks} hint="across all inboxes + sprint" icon={<ListChecks className="w-4 h-4 text-[color:var(--ops-fg-soft)]" />} />
          <StatCard label="High priority" value={o.counts.highPriority} tone={o.counts.highPriority > 0 ? 'danger' : 'default'} icon={<AlertTriangle className="w-4 h-4 text-[color:var(--ops-fg-soft)]" />} />
          <StatCard label="Needs founder" value={o.counts.needsFounder} tone={o.counts.needsFounder > 0 ? 'warn' : 'default'} hint="escalation queue" icon={<Inbox className="w-4 h-4 text-[color:var(--ops-fg-soft)]" />} />
          <StatCard label="Agents" value={o.counts.agents} icon={<Users className="w-4 h-4 text-[color:var(--ops-fg-soft)]" />} />
          <StatCard label="Activity (7d)" value={o.counts.logEntries7d} hint="log entries" icon={<Activity className="w-4 h-4 text-[color:var(--ops-fg-soft)]" />} />
        </div>

        {/* Sprint board summary */}
        <Section title="Sprint board" action={<Link href="/ops/tasks" className="text-[12px] ops-link">View all tasks →</Link>}>
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { label: 'In progress', value: o.sprint.counts.inProgress, tone: 'accent' as const },
              { label: 'Ready',       value: o.sprint.counts.ready,      tone: 'default' as const },
              { label: 'Blocked',     value: o.sprint.counts.blocked,    tone: 'warn' as const },
              { label: 'Done',        value: o.sprint.counts.done,       tone: 'success' as const },
            ].map(c => (
              <div key={c.label} className="px-5 py-4 border-r last:border-r-0 border-[color:var(--ops-border)]">
                <div className="text-[11px] uppercase tracking-[0.06em] text-[color:var(--ops-fg-soft)] font-medium">{c.label}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[24px] font-semibold tabular-nums tracking-tight text-[color:var(--ops-fg)]">{c.value}</span>
                  <Badge tone={c.tone}>{c.tone === 'success' ? 'shipped' : c.tone === 'warn' ? 'attention' : c.tone === 'accent' ? 'active' : 'queued'}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inbox depth */}
          <Section title="Inbox depth" action={<Link href="/ops/tasks" className="text-[12px] ops-link">Open tasks →</Link>}>
            {Object.keys(o.inboxDepth).length === 0 ? (
              <EmptyState message="No inbox files found." />
            ) : (
              <div>
                {Object.entries(o.inboxDepth).map(([who, n]) => (
                  <Link
                    key={who}
                    href={`/ops/tasks?inbox=${who}`}
                    className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 border-[color:var(--ops-border)] hover:bg-[#fafbfc]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium capitalize text-[color:var(--ops-fg)]">{who}</span>
                      <span className="text-[11px] text-[color:var(--ops-fg-soft)]">inbox</span>
                    </div>
                    <span className={[
                      'text-[12px] tabular-nums px-2 py-0.5 rounded border',
                      n === 0
                        ? 'bg-white text-[color:var(--ops-fg-soft)] border-[color:var(--ops-border)]'
                        : 'bg-[color:var(--ops-accent-soft)] text-[color:var(--ops-accent)] border-[#d1e0ff]',
                    ].join(' ')}>
                      {n} open
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          {/* Needs founder */}
          <Section
            title="Awaiting founder decision"
            count={o.needsFounder.length}
            tone={o.needsFounder.length > 0 ? 'warn' : 'default'}
            action={<Link href="/ops/founder" className="text-[12px] ops-link">All decisions →</Link>}
          >
            {o.needsFounder.length === 0 ? (
              <EmptyState message="Inbox is clear — no escalations open." />
            ) : (
              <ul className="divide-y divide-[color:var(--ops-border)]">
                {o.needsFounder.slice(0, 5).map((n, i) => (
                  <li key={i} className="px-4 py-3 text-[13px] text-[color:var(--ops-fg)] whitespace-pre-wrap">
                    {n.body}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Latest activity */}
        <Section title="Latest activity" action={<Link href="/ops/log" className="text-[12px] ops-link">Full log →</Link>}>
          {o.latestLog.length === 0 ? (
            <EmptyState message="Daily log is empty." />
          ) : (
            <ul>
              {o.latestLog.map((e, i) => (
                <li key={i} className="px-4 py-3 border-b last:border-b-0 border-[color:var(--ops-border)] grid grid-cols-[90px_140px_1fr] gap-4 items-start">
                  <span className="ops-mono text-[11px] text-[color:var(--ops-fg-soft)] mt-0.5">{e.date}</span>
                  <span className="text-[12px] font-medium text-[color:var(--ops-fg)] mt-0.5 truncate">{e.agent}</span>
                  <span className="text-[12px] text-[color:var(--ops-fg-muted)]">
                    <span className="text-[color:var(--ops-fg)]">{e.task}</span>
                    {e.status && (
                      <Badge tone={e.status === 'done' ? 'success' : e.status === 'blocked' ? 'danger' : 'default'}>
                        {e.status}
                      </Badge>
                    )}
                    {e.note && <span className="block mt-0.5 text-[color:var(--ops-fg-soft)]">{e.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="text-[11px] text-[color:var(--ops-fg-soft)] flex items-center gap-1.5 pt-2">
          <Clock className="w-3 h-3" /> Refreshes on every page load — files are read live from disk.
        </div>
      </div>
    </>
  )
}
