import { loadFounderQueue, loadNeedsFounder } from '@/lib/ops/parsers'
import PageHeader from '../components/PageHeader'
import Section from '../components/Section'
import TaskRow from '../components/TaskRow'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'

export const dynamic = 'force-dynamic'

export default async function FounderPage() {
  const [queue, needs] = await Promise.all([
    loadFounderQueue(),
    loadNeedsFounder(),
  ])

  const openNeeds = needs.filter(n => n.status === 'open')
  const resolvedNeeds = needs.filter(n => n.status === 'resolved')

  return (
    <>
      <PageHeader
        eyebrow="Escalation queue"
        title="Decisions"
        description="Items waiting on you. Agents append here when they hit irreversible decisions or scope blockers — read every morning to keep them moving."
      />
      <div className="px-8 py-6 space-y-6">
        <Section
          title="Open — needs founder decision"
          count={openNeeds.length + queue.open.length}
          tone={(openNeeds.length + queue.open.length) > 0 ? 'warn' : 'default'}
        >
          {(openNeeds.length === 0 && queue.open.length === 0) ? (
            <EmptyState message="No open decisions. You're caught up." />
          ) : (
            <>
              {queue.open.map((t, i) => <TaskRow key={`q-${i}`} task={t} />)}
              {openNeeds.map((n, i) => (
                <div key={`n-${i}`} className="px-4 py-3 border-b last:border-b-0 border-[color:var(--ops-border)]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge tone="warn">NEEDS_FOUNDER.md</Badge>
                  </div>
                  <pre className="text-[13px] text-[color:var(--ops-fg)] whitespace-pre-wrap font-sans leading-relaxed">{n.body}</pre>
                </div>
              ))}
            </>
          )}
        </Section>

        <Section title="Recently resolved" count={queue.resolved.length + resolvedNeeds.length}>
          {(queue.resolved.length === 0 && resolvedNeeds.length === 0) ? (
            <EmptyState />
          ) : (
            <>
              {queue.resolved.slice(0, 10).map((t, i) => <TaskRow key={`r-${i}`} task={t} />)}
              {resolvedNeeds.slice(0, 5).map((n, i) => (
                <div key={`rn-${i}`} className="px-4 py-3 border-b last:border-b-0 border-[color:var(--ops-border)]">
                  <pre className="text-[12px] text-[color:var(--ops-fg-muted)] whitespace-pre-wrap font-sans leading-relaxed">{n.body}</pre>
                </div>
              ))}
            </>
          )}
        </Section>
      </div>
    </>
  )
}
