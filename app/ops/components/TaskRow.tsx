import Link from 'next/link'
import { Send } from 'lucide-react'
import Badge, { priorityTone } from './Badge'
import type { Task } from '@/lib/ops/types'

function inferAgent(task: Task): string {
  const src = task.source
  if (src === 'inbox:pm') return 'pm-agent'
  if (src === 'inbox:ux') return 'ux-agent'
  if (src === 'inbox:engineering') return 'lead-engineer'
  if (src === 'sprint') return 'lead-engineer'
  return 'lead-engineer'
}

export default function TaskRow({ task, showSource = false }: { task: Task; showSource?: boolean }) {
  return (
    <div className="group px-4 py-3 border-b border-[color:var(--ops-border)] last:border-b-0 hover:bg-[#fafbfc] transition-colors">
      <div className="flex items-start gap-3">
        <div className={[
          'mt-1 w-3.5 h-3.5 shrink-0 rounded border flex items-center justify-center',
          task.done
            ? 'bg-[color:var(--ops-success)] border-[color:var(--ops-success)]'
            : 'bg-white border-[color:var(--ops-border-strong)]',
        ].join(' ')}>
          {task.done && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6.5L5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {task.id && <Badge tone="default" mono>{task.id}</Badge>}
            <span className={[
              'text-[13px]',
              task.done ? 'text-[color:var(--ops-fg-soft)] line-through' : 'text-[color:var(--ops-fg)] font-medium',
            ].join(' ')}>
              {task.title}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px]">
            {task.priority && (
              <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
            )}
            {task.from && <span className="text-[color:var(--ops-fg-soft)]">from <span className="text-[color:var(--ops-fg-muted)]">{task.from}</span></span>}
            {showSource && (
              <span className="text-[color:var(--ops-fg-soft)]">
                · <span className="ops-mono">{task.source}</span>
                {task.section && <> · {task.section}</>}
              </span>
            )}
          </div>
          {!task.done && (
            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link
                href={{
                  pathname: '/ops/dispatch',
                  query: {
                    agent: inferAgent(task),
                    prompt: [task.title, ...task.details].join('\n').slice(0, 1500),
                  },
                }}
                className="inline-flex items-center gap-1 text-[11px] text-[color:var(--ops-accent)] hover:underline"
              >
                <Send className="w-3 h-3" /> Dispatch this task
              </Link>
            </div>
          )}
          {task.details.length > 0 && (
            <details className="mt-2 group">
              <summary className="text-[11px] text-[color:var(--ops-fg-soft)] cursor-pointer hover:text-[color:var(--ops-fg-muted)] list-none flex items-center gap-1">
                <svg className="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 12 12" fill="none">
                  <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {task.details.length} detail{task.details.length === 1 ? '' : 's'}
              </summary>
              <ul className="mt-1.5 ml-4 space-y-1 text-[12px] text-[color:var(--ops-fg-muted)] leading-relaxed">
                {task.details.map((d, i) => (
                  <li key={i} className="list-disc list-outside">{d}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
