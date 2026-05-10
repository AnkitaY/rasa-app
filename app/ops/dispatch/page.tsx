import { loadAgents, loadAllInboxes } from '@/lib/ops/parsers'
import PageHeader from '../components/PageHeader'
import DispatchConsole from './components/DispatchConsole'

export const dynamic = 'force-dynamic'

export default async function DispatchPage({
  searchParams,
}: { searchParams: { agent?: string; prompt?: string } }) {
  const [agents, inboxes] = await Promise.all([
    loadAgents(),
    loadAllInboxes(),
  ])

  // Pre-build a flat list of open tasks the user can attach as context
  const openTasks = Object.values(inboxes).flat()
    .filter(t => !t.done && !/^Processed/i.test(t.section) && !/^Resolved/i.test(t.section))
    .map(t => ({
      id: t.id || '',
      label: `${t.id ? `[${t.id}] ` : ''}${t.title}`,
      detail: [t.title, ...t.details].join('\n'),
      source: t.source,
      priority: t.priority,
    }))

  return (
    <>
      <PageHeader
        eyebrow="Dispatch"
        title="Run an agent"
        description="Send any agent a task. Inference runs against the Anthropic API; the orchestration and file edits run locally on this machine. Each dispatch is capped at $1 by default."
      />
      <DispatchConsole
        agents={agents.map(a => ({
          name: a.name,
          description: a.description,
          model: a.model,
          tools: a.tools,
          disallowedTools: a.disallowedTools,
        }))}
        tasks={openTasks}
        initialAgent={searchParams.agent || agents[0]?.name || ''}
        initialPrompt={searchParams.prompt || ''}
      />
    </>
  )
}
