import { notFound } from 'next/navigation'
import Link from 'next/link'
import { loadAgent, loadDailyLog } from '@/lib/ops/parsers'
import PageHeader from '../../components/PageHeader'
import Section from '../../components/Section'
import Badge from '../../components/Badge'
import EmptyState from '../../components/EmptyState'
import { ArrowLeft, Send } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AgentDetailPage({ params }: { params: { name: string } }) {
  const [agent, log] = await Promise.all([
    loadAgent(params.name),
    loadDailyLog(),
  ])
  if (!agent) notFound()

  const entries = log.filter(e => e.agent === agent.name)

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/ops/agents" className="ops-link inline-flex items-center gap-1 normal-case tracking-normal text-[color:var(--ops-accent)]">
            <ArrowLeft className="w-3 h-3" /> Agents
          </Link>
        }
        title={agent.name}
        description={agent.description}
        actions={
          <div className="flex items-center gap-2">
            {agent.model && <Badge tone="default" mono>{agent.model}</Badge>}
            <Link
              href={`/ops/dispatch?agent=${encodeURIComponent(agent.name)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[color:var(--ops-accent)] hover:bg-[#1747c5] text-white text-[12px] font-medium transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Dispatch
            </Link>
          </div>
        }
      />
      <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="System prompt" count={undefined}>
            <pre className="p-4 text-[12px] leading-relaxed font-mono text-[color:var(--ops-fg)] whitespace-pre-wrap break-words bg-[#fafbfc] max-h-[600px] overflow-auto">
              {agent.body || '(no body)'}
            </pre>
          </Section>

          <Section title="Activity log" count={entries.length}>
            {entries.length === 0 ? (
              <EmptyState message="No daily-log entries yet for this agent." />
            ) : (
              <ul>
                {entries.map((e, i) => (
                  <li key={i} className="px-4 py-3 border-b last:border-b-0 border-[color:var(--ops-border)] grid grid-cols-[90px_1fr] gap-4 items-start">
                    <span className="ops-mono text-[11px] text-[color:var(--ops-fg-soft)] mt-0.5">{e.date}</span>
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
        </div>

        <div className="space-y-6">
          <Section title="Configuration">
            <dl className="px-4 py-3 text-[12px] space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-[color:var(--ops-fg-soft)]">File</dt>
                <dd className="ops-mono text-[color:var(--ops-fg)] truncate">.claude/agents/{agent.filename}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[color:var(--ops-fg-soft)]">Model</dt>
                <dd className="ops-mono text-[color:var(--ops-fg)]">{agent.model || '—'}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Tools" count={agent.tools.length}>
            {agent.tools.length === 0 ? (
              <EmptyState message="No tools declared." />
            ) : (
              <ul className="px-4 py-3 flex flex-wrap gap-1.5">
                {agent.tools.map(t => <li key={t}><Badge tone="accent" mono>{t}</Badge></li>)}
              </ul>
            )}
          </Section>

          {agent.disallowedTools.length > 0 && (
            <Section title="Disallowed tools" count={agent.disallowedTools.length} tone="danger">
              <ul className="px-4 py-3 flex flex-wrap gap-1.5">
                {agent.disallowedTools.map(t => <li key={t}><Badge tone="danger" mono>{t}</Badge></li>)}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </>
  )
}
