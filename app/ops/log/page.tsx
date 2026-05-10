import { loadDailyLog } from '@/lib/ops/parsers'
import PageHeader from '../components/PageHeader'
import Section from '../components/Section'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const log = await loadDailyLog()

  // Group by date
  const grouped = new Map<string, typeof log>()
  for (const e of log) {
    const arr = grouped.get(e.date) || []
    arr.push(e)
    grouped.set(e.date, arr)
  }

  return (
    <>
      <PageHeader
        eyebrow="Activity"
        title="Daily agent log"
        description="Append-only record of completed work. Newest first."
      />
      <div className="px-8 py-6 space-y-6">
        {grouped.size === 0 ? (
          <Section title="Log"><EmptyState message="No log entries yet." /></Section>
        ) : (
          Array.from(grouped.entries()).map(([date, entries]) => (
            <Section key={date} title={date} count={entries.length}>
              <ul>
                {entries.map((e, i) => (
                  <li key={i} className="px-4 py-3 border-b last:border-b-0 border-[color:var(--ops-border)] grid grid-cols-[180px_1fr] gap-4 items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-[color:var(--ops-fg)]">{e.agent}</span>
                      {e.status && (
                        <Badge tone={e.status === 'done' ? 'success' : e.status === 'blocked' ? 'danger' : 'default'}>
                          {e.status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[12px] leading-relaxed">
                      <div className="text-[color:var(--ops-fg)]">{e.task}</div>
                      {e.note && <div className="mt-0.5 text-[color:var(--ops-fg-muted)]">{e.note}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          ))
        )}
      </div>
    </>
  )
}
