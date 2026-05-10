import Link from 'next/link'
import { loadAllInboxes, loadSprint } from '@/lib/ops/parsers'
import type { Task } from '@/lib/ops/types'
import PageHeader from '../components/PageHeader'
import Section from '../components/Section'
import TaskRow from '../components/TaskRow'
import EmptyState from '../components/EmptyState'

export const dynamic = 'force-dynamic'

const FILTERS = [
  { key: 'all',     label: 'All open' },
  { key: 'high',    label: 'High priority' },
  { key: 'pm',      label: 'PM' },
  { key: 'engineering', label: 'Engineering' },
  { key: 'ux',      label: 'UX' },
  { key: 'sprint',  label: 'Sprint board' },
  { key: 'done',    label: 'Recently done' },
]

function applyFilter(tasks: Task[], inbox: string | undefined, filter: string | undefined): Task[] {
  let out = tasks
  if (inbox) out = out.filter(t => t.source === `inbox:${inbox}` || (inbox === 'sprint' && t.source === 'sprint'))

  switch (filter) {
    case 'high':         return out.filter(t => !t.done && t.priority === 'HIGH')
    case 'pm':           return out.filter(t => t.source === 'inbox:pm' && !t.done)
    case 'engineering':  return out.filter(t => t.source === 'inbox:engineering' && !t.done && !/^Processed/i.test(t.section))
    case 'ux':           return out.filter(t => t.source === 'inbox:ux' && !t.done)
    case 'sprint':       return out.filter(t => t.source === 'sprint' && !t.done)
    case 'done':         return out.filter(t => t.done).slice(0, 30)
    default:             return out.filter(t => !t.done && !/^Processed/i.test(t.section) && !/^Resolved/i.test(t.section))
  }
}

const PRIORITY_RANK: Record<string, number> = { HIGH: 0, MED: 1, LOW: 2, PARKED: 3 }
function sortTasks(a: Task, b: Task) {
  const pa = PRIORITY_RANK[a.priority || ''] ?? 4
  const pb = PRIORITY_RANK[b.priority || ''] ?? 4
  if (pa !== pb) return pa - pb
  return a.title.localeCompare(b.title)
}

export default async function TasksPage({ searchParams }: { searchParams: { filter?: string; inbox?: string } }) {
  const [inboxes, sprint] = await Promise.all([loadAllInboxes(), loadSprint()])

  const all: Task[] = [
    ...Object.values(inboxes).flat(),
    ...sprint.allTasks,
  ]

  const filter = searchParams.filter || 'all'
  const inbox = searchParams.inbox
  const filtered = applyFilter(all, inbox, filter).sort(sortTasks)

  // Group by source for the kanban-ish layout
  const groups: Record<string, Task[]> = {}
  for (const t of filtered) {
    const key = t.source.startsWith('inbox:') ? t.source.replace('inbox:', '') + ' inbox' : 'sprint board'
    ;(groups[key] ||= []).push(t)
  }

  return (
    <>
      <PageHeader
        eyebrow="Work queue"
        title="Tasks"
        description="Live view across all inbox files and the active sprint board. Click any task to expand its details."
      />

      <div className="px-8 py-5 border-b border-[color:var(--ops-border)] bg-white">
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => {
            const active = (filter || 'all') === f.key && !inbox
            return (
              <Link
                key={f.key}
                href={`/ops/tasks?filter=${f.key}`}
                className={[
                  'px-3 py-1.5 text-[12px] font-medium rounded-md border transition-colors',
                  active
                    ? 'bg-[color:var(--ops-accent)] text-white border-[color:var(--ops-accent)]'
                    : 'bg-white text-[color:var(--ops-fg-muted)] border-[color:var(--ops-border)] hover:border-[color:var(--ops-border-strong)] hover:text-[color:var(--ops-fg)]',
                ].join(' ')}
              >
                {f.label}
              </Link>
            )
          })}
          {inbox && (
            <span className="px-3 py-1.5 text-[12px] font-medium rounded-md bg-[color:var(--ops-accent)] text-white">
              {inbox} inbox
            </span>
          )}
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {Object.keys(groups).length === 0 ? (
          <Section title="Results">
            <EmptyState message="No tasks match this filter." />
          </Section>
        ) : (
          Object.entries(groups).map(([key, tasks]) => (
            <Section key={key} title={key} count={tasks.length}>
              {tasks.length === 0 ? <EmptyState /> : tasks.map((t, i) => <TaskRow key={i} task={t} showSource />)}
            </Section>
          ))
        )}
      </div>
    </>
  )
}
