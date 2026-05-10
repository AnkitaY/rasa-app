import { loadThreads } from '@/lib/ops/parsers'
import PageHeader from '../components/PageHeader'
import Section from '../components/Section'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'

export const dynamic = 'force-dynamic'

const SOURCE_LABEL: Record<string, string> = {
  'inbox:engineering': 'Engineering inbox',
  'inbox:pm': 'PM inbox',
  'inbox:ux': 'UX inbox',
  'inbox:founder': 'Founder inbox',
  'sprint': 'Sprint board',
  'log': 'Daily log',
}

export default async function ThreadsPage() {
  const threads = await loadThreads()

  const open   = threads.filter(t => t.status === 'open')
  const closed = threads.filter(t => t.status === 'closed')

  return (
    <>
      <PageHeader
        eyebrow="Cross-file view"
        title="Threads"
        description="Each tracked work item (BUG-001, IMP-001, etc.) reconstructed from every file it appears in — like a chat history of how the work moved between agents."
      />
      <div className="px-8 py-6 space-y-6">
        <Section title="Open threads" count={open.length} tone={open.length > 0 ? 'warn' : 'default'}>
          {open.length === 0
            ? <EmptyState message="No open threads — every tracked task has shipped." />
            : <ul>{open.map(t => <ThreadRow key={t.id} thread={t} />)}</ul>}
        </Section>

        <Section title="Closed threads" count={closed.length}>
          {closed.length === 0
            ? <EmptyState />
            : <ul>{closed.map(t => <ThreadRow key={t.id} thread={t} />)}</ul>}
        </Section>
      </div>
    </>
  )
}

function ThreadRow({ thread }: { thread: Awaited<ReturnType<typeof loadThreads>>[number] }) {
  return (
    <li className="px-4 py-3 border-b last:border-b-0 border-[color:var(--ops-border)]">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone={thread.status === 'closed' ? 'success' : 'warn'} mono>{thread.id}</Badge>
        <span className="text-[13px] font-medium text-[color:var(--ops-fg)]">{thread.title}</span>
        <span className="text-[11px] text-[color:var(--ops-fg-soft)] ml-auto">
          {thread.appearances.length} appearance{thread.appearances.length === 1 ? '' : 's'}
        </span>
      </div>
      <ol className="mt-2.5 ml-2 border-l-2 border-[color:var(--ops-border)] pl-4 space-y-1.5">
        {thread.appearances.map((a, i) => (
          <li key={i} className="text-[12px] flex items-start gap-2">
            <span className="ops-mono text-[10px] uppercase tracking-wider text-[color:var(--ops-fg-soft)] mt-0.5 shrink-0 min-w-[110px]">
              {SOURCE_LABEL[a.source] || a.source}
            </span>
            <span className="text-[color:var(--ops-fg-muted)]">
              {a.detail}
              {a.date && <span className="ops-mono text-[color:var(--ops-fg-soft)]"> · {a.date}</span>}
              {a.section && !a.date && <span className="text-[color:var(--ops-fg-soft)]"> · {a.section}</span>}
            </span>
          </li>
        ))}
      </ol>
    </li>
  )
}
