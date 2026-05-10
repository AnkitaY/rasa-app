import Link from 'next/link'
import { loadAgents, loadAllInboxes, loadDailyLog } from '@/lib/ops/parsers'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import { ArrowRight, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

const ROLE_TAG: Record<string, string> = {
  'pm-agent': 'Product',
  'ux-agent': 'Design',
  'lead-engineer': 'Engineering',
  'frontend-engineer': 'Engineering',
  'backend-engineer': 'Engineering',
  'code-reviewer': 'Engineering',
  'test-engineer': 'Quality',
  'qa-agent': 'Quality',
  'debug-agent': 'Engineering',
  'security-reviewer': 'Security',
}

function inboxFor(name: string): string | null {
  if (name.includes('pm')) return 'pm'
  if (name.includes('ux')) return 'ux'
  if (name.includes('engineer') || name.includes('reviewer') || name.includes('debug') || name.includes('test') || name.includes('qa')) return 'engineering'
  return null
}

export default async function AgentsPage() {
  const [agents, inboxes, log] = await Promise.all([
    loadAgents(),
    loadAllInboxes(),
    loadDailyLog(),
  ])

  // Last activity timestamp per agent name
  const lastActivity = new Map<string, string>()
  for (const e of log) {
    if (!lastActivity.has(e.agent)) lastActivity.set(e.agent, e.date)
  }

  return (
    <>
      <PageHeader
        eyebrow="Workforce"
        title="Agents"
        description="Each agent is configured by a markdown file in .claude/agents/. They read their inbox at session start and write back as they complete work."
      />
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map(a => {
            const inbox = inboxFor(a.name)
            const inboxCount = inbox ? (inboxes[inbox] || []).filter(t => !t.done && !/^Processed/i.test(t.section)).length : 0
            const last = lastActivity.get(a.name)
            const role = ROLE_TAG[a.name] || 'Agent'
            return (
              <Link
                key={a.name}
                href={`/ops/agents/${a.name}`}
                className="ops-card p-5 hover:border-[color:var(--ops-border-strong)] hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone="muted">{role}</Badge>
                      {a.model && <Badge tone="default" mono>{a.model.replace('claude-', '')}</Badge>}
                    </div>
                    <div className="mt-2 text-[14px] font-semibold tracking-tight text-[color:var(--ops-fg)]">
                      {a.name}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[color:var(--ops-fg-soft)] group-hover:text-[color:var(--ops-accent)] mt-1 shrink-0" />
                </div>

                <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--ops-fg-muted)] line-clamp-3">
                  {a.description || 'No description.'}
                </p>

                <div className="mt-4 pt-3 border-t border-[color:var(--ops-border)] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-3 text-[color:var(--ops-fg-soft)]">
                    {inbox && (
                      <span className="flex items-center gap-1">
                        <span>{inbox} inbox:</span>
                        <span className={inboxCount > 0 ? 'font-medium text-[color:var(--ops-accent)]' : ''}>
                          {inboxCount}
                        </span>
                      </span>
                    )}
                    {a.tools.length > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {a.tools.length} tool{a.tools.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <span className="ops-mono text-[color:var(--ops-fg-soft)]">
                    {last ? `last seen ${last}` : 'no activity'}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
