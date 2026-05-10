'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
// The dispatch transcript renders untyped JSON from the claude CLI's stream-json
// output. The shape evolves with CLI versions; using `any` here is intentional —
// every access is null-checked or stringified before render.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Send, Square, RotateCw, ChevronDown, AlertTriangle,
  Loader2, CheckCircle2, XCircle, Sparkles, Wrench, FileText,
  Clock, DollarSign,
} from 'lucide-react'
import Badge from '../../components/Badge'

interface AgentSummary {
  name: string
  description: string
  model: string | null
  tools: string[]
  disallowedTools: string[]
}

interface TaskSummary {
  id: string
  label: string
  detail: string
  source: string
  priority: string | null
}

interface JobSummary {
  id: string
  agent: string
  prompt: string
  status: 'running' | 'done' | 'cancelled' | 'error'
  startedAt: number
  endedAt?: number
  exitCode?: number | null
  costUsd?: number
  numTurns?: number
  durationMs?: number
  error?: string
}

interface DispatchEvent {
  ts: number
  kind: 'system' | 'stdout' | 'stderr' | 'status'
  data: any
  raw?: string
}

const PERMISSION_MODES = [
  { value: 'bypassPermissions', label: 'Bypass — agent runs unattended (default)' },
  { value: 'acceptEdits',       label: 'Accept edits — Bash still requires approval (will hang)' },
  { value: 'plan',              label: 'Plan only — propose changes, do not execute' },
]

export default function DispatchConsole({
  agents, tasks, initialAgent, initialPrompt,
}: {
  agents: AgentSummary[]
  tasks: TaskSummary[]
  initialAgent: string
  initialPrompt: string
}) {
  const [agent, setAgent] = useState(initialAgent)
  const [prompt, setPrompt] = useState(initialPrompt)
  const [permissionMode, setPermissionMode] = useState('bypassPermissions')
  const [model, setModel] = useState('')
  const [maxBudgetUsd, setMaxBudgetUsd] = useState('1.00')
  const [attachTaskId, setAttachTaskId] = useState('')

  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [events, setEvents] = useState<DispatchEvent[]>([])
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error' | 'cancelled'>('idle')
  const [statusData, setStatusData] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [history, setHistory] = useState<JobSummary[]>([])

  const transcriptRef = useRef<HTMLDivElement | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const selectedAgent = agents.find(a => a.name === agent) || null

  const refreshHistory = useCallback(async () => {
    try {
      const r = await fetch('/api/ops/dispatch/list', { cache: 'no-store' })
      if (!r.ok) return
      const j = await r.json()
      setHistory(j.jobs || [])
    } catch { /* */ }
  }, [])

  useEffect(() => { void refreshHistory() }, [refreshHistory])

  const openJob = useCallback(async (id: string) => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    setActiveJobId(id)
    setEvents([])
    setStatus('running')
    setStatusData(null)

    const es = new EventSource(`/api/ops/dispatch/stream?id=${encodeURIComponent(id)}`)
    esRef.current = es
    es.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data) as DispatchEvent
        if (ev.kind === 'status') {
          const s = ev.data?.status as JobSummary['status'] | undefined
          if (s) setStatus(s === 'running' ? 'running' : s)
          setStatusData(ev.data)
          if (s && s !== 'running') void refreshHistory()
        } else {
          setEvents(prev => [...prev, ev])
        }
      } catch { /* */ }
    }
    es.onerror = () => {
      // EventSource auto-reconnects; close on terminal status
    }
  }, [refreshHistory])

  // Auto-scroll transcript to bottom on new events
  useEffect(() => {
    const el = transcriptRef.current
    if (!el) return
    // Only auto-scroll if user is near bottom
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [events])

  // Cleanup
  useEffect(() => () => { esRef.current?.close() }, [])

  const send = async () => {
    setErrorMsg(null)
    if (!agent.trim() || !prompt.trim()) {
      setErrorMsg('Pick an agent and write a prompt.')
      return
    }
    let finalPrompt = prompt
    if (attachTaskId) {
      const t = tasks.find(x => x.id === attachTaskId)
      if (t) finalPrompt = `Task context (${t.id}, from ${t.source}):\n${t.detail}\n\n---\n\n${prompt}`
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/ops/dispatch/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent,
          prompt: finalPrompt,
          permissionMode,
          model: model || undefined,
          maxBudgetUsd: parseFloat(maxBudgetUsd) || 1,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Failed to start dispatch')
      await openJob(j.id)
      void refreshHistory()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const cancel = async () => {
    if (!activeJobId) return
    await fetch('/api/ops/dispatch/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeJobId }),
    })
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 px-8 py-6">
      {/* LEFT: form */}
      <div className="space-y-5">
        <Card title="Agent" subtitle={`${agents.length} configured`}>
          <div className="max-h-[260px] overflow-y-auto">
            {agents.map(a => {
              const active = a.name === agent
              return (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => setAgent(a.name)}
                  className={[
                    'w-full text-left px-4 py-2.5 border-b border-[color:var(--ops-border)] last:border-b-0 transition-colors',
                    active ? 'bg-[color:var(--ops-accent-soft)]' : 'hover:bg-[#fafbfc]',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={[
                      'text-[13px] font-medium',
                      active ? 'text-[color:var(--ops-accent)]' : 'text-[color:var(--ops-fg)]',
                    ].join(' ')}>
                      {a.name}
                    </span>
                    {a.model && <span className="ops-mono text-[10px] text-[color:var(--ops-fg-soft)]">{a.model.replace('claude-', '')}</span>}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[color:var(--ops-fg-soft)] line-clamp-2">
                    {a.description || '—'}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        <Card title="Attach an open task (optional)">
          <div className="px-3 py-3">
            <select
              className="w-full text-[12px] px-2.5 py-1.5 rounded-md border border-[color:var(--ops-border)] bg-white"
              value={attachTaskId}
              onChange={e => setAttachTaskId(e.target.value)}
            >
              <option value="">— none —</option>
              {tasks.filter(t => t.id).map(t => (
                <option key={`${t.source}-${t.id}`} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            {attachTaskId && (
              <div className="mt-2 text-[11px] text-[color:var(--ops-fg-soft)]">
                The task’s title and details will be prepended to your prompt as context.
              </div>
            )}
          </div>
        </Card>

        <Card title="Prompt">
          <div className="px-3 py-3">
            <textarea
              className="w-full min-h-[140px] px-3 py-2 text-[13px] leading-relaxed rounded-md border border-[color:var(--ops-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ops-accent)] focus:border-transparent bg-white resize-y"
              placeholder={selectedAgent
                ? `Ask ${selectedAgent.name} to…`
                : 'Pick an agent first.'}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </div>
        </Card>

        <Card
          title="Run options"
          right={
            <Badge tone="success">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Claude Max
              </span>
            </Badge>
          }
        >
          <div className="px-3 py-3 space-y-3">
            <Field label="Permission mode">
              <select
                className="w-full text-[12px] px-2.5 py-1.5 rounded-md border border-[color:var(--ops-border)] bg-white"
                value={permissionMode}
                onChange={e => setPermissionMode(e.target.value)}
              >
                {PERMISSION_MODES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Model override">
                <input
                  type="text"
                  placeholder="(agent default)"
                  className="w-full text-[12px] px-2.5 py-1.5 rounded-md border border-[color:var(--ops-border)] bg-white ops-mono"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                />
              </Field>
              <Field label="Budget cap (USD)">
                <input
                  type="number" min="0.05" step="0.05"
                  title="Forwarded to the CLI as --max-budget-usd. Ignored by Claude Max OAuth — runs count against your subscription rate limits, not dollars."
                  className="w-full text-[12px] px-2.5 py-1.5 rounded-md border border-[color:var(--ops-border)] bg-white ops-mono"
                  value={maxBudgetUsd}
                  onChange={e => setMaxBudgetUsd(e.target.value)}
                />
              </Field>
            </div>
            <div className="text-[11px] text-[color:var(--ops-fg-soft)] leading-relaxed">
              Dispatches authenticate via your <span className="font-medium text-[color:var(--ops-fg)]">Claude Max</span> login on this machine
              (<span className="ops-mono">claude /login</span>). The Anthropic API key in <span className="ops-mono">.env.local</span> is
              stripped from the child process so usage counts against your subscription, not per-token billing.
            </div>
            {permissionMode === 'bypassPermissions' && (
              <div className="text-[11px] text-[color:var(--ops-warn)] flex items-start gap-1.5">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>Bypass mode runs the agent unattended — it can edit files and run shell commands without confirmation. Only use on a single-user local box.</span>
              </div>
            )}
          </div>
        </Card>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={send}
            disabled={submitting || status === 'running'}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[color:var(--ops-accent)] hover:bg-[#1747c5] disabled:bg-[#94a3b8] disabled:cursor-not-allowed text-white text-[13px] font-medium transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Starting…' : status === 'running' ? 'Running — wait or cancel' : 'Send to agent'}
          </button>
          {status === 'running' && activeJobId && (
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md border border-[color:var(--ops-border)] hover:border-[color:var(--ops-danger)] hover:text-[color:var(--ops-danger)] text-[13px] font-medium transition-colors"
            >
              <Square className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
        {errorMsg && (
          <div className="text-[12px] text-[color:var(--ops-danger)] bg-[color:var(--ops-danger-soft)] border border-[#fecdca] rounded-md px-3 py-2">
            {errorMsg}
          </div>
        )}
      </div>

      {/* RIGHT: transcript + history */}
      <div className="space-y-5 min-w-0">
        <Card
          title={
            <span className="flex items-center gap-2">
              Transcript
              {activeJobId && (
                <span className="ops-mono text-[10px] text-[color:var(--ops-fg-soft)] font-normal">
                  {activeJobId.slice(0, 8)}
                </span>
              )}
            </span>
          }
          right={<StatusPill status={status} data={statusData} />}
        >
          <div
            ref={transcriptRef}
            className="px-4 py-3 max-h-[58vh] min-h-[300px] overflow-y-auto bg-[#fbfcfd]"
          >
            {events.length === 0 && status === 'idle' && (
              <EmptyTranscript selected={selectedAgent} />
            )}
            {events.length === 0 && status === 'running' && (
              <div className="flex items-center gap-2 text-[12px] text-[color:var(--ops-fg-soft)] py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Waiting for first response from {agent}…
              </div>
            )}
            <TranscriptStream events={events} />
          </div>
          {statusData && (status === 'done' || status === 'error' || status === 'cancelled') && (
            <FinalSummary data={statusData} status={status} />
          )}
        </Card>

        <Card
          title={<span className="flex items-center gap-2">Recent dispatches <span className="text-[11px] text-[color:var(--ops-fg-soft)] font-normal">{history.length}</span></span>}
          right={
            <button
              type="button"
              onClick={() => void refreshHistory()}
              className="text-[11px] text-[color:var(--ops-fg-soft)] hover:text-[color:var(--ops-fg)] inline-flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" /> Refresh
            </button>
          }
        >
          {history.length === 0 ? (
            <div className="px-4 py-6 text-[12px] text-[color:var(--ops-fg-soft)] text-center">
              No dispatches yet.
            </div>
          ) : (
            <ul>
              {history.slice(0, 25).map(j => (
                <li key={j.id}>
                  <button
                    type="button"
                    onClick={() => void openJob(j.id)}
                    className={[
                      'w-full text-left px-4 py-2.5 border-b last:border-b-0 border-[color:var(--ops-border)] hover:bg-[#fafbfc] flex items-center gap-3',
                      activeJobId === j.id ? 'bg-[color:var(--ops-accent-soft)]' : '',
                    ].join(' ')}
                  >
                    <StatusDot status={j.status} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-medium text-[color:var(--ops-fg)]">{j.agent}</span>
                        <span className="ops-mono text-[10px] text-[color:var(--ops-fg-soft)]">{j.id.slice(0, 8)}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-[color:var(--ops-fg-muted)] truncate">
                        {j.prompt}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-[color:var(--ops-fg-soft)] ops-mono">
                        {fmtRelative(j.startedAt)}
                      </div>
                      {j.costUsd != null && (
                        <div className="text-[10px] text-[color:var(--ops-fg-soft)] ops-mono">
                          ${j.costUsd.toFixed(3)}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

// ─── helpers / sub-components ──────────────────────────────────────────

function Card({
  title, subtitle, right, children,
}: { title: React.ReactNode; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ops-card overflow-hidden">
      <header className="px-4 py-2.5 border-b border-[color:var(--ops-border)] flex items-center justify-between bg-[#fafbfc]">
        <div className="flex items-center gap-2">
          <h2 className="text-[12px] font-semibold tracking-tight text-[color:var(--ops-fg)]">{title}</h2>
          {subtitle && <span className="text-[11px] text-[color:var(--ops-fg-soft)]">{subtitle}</span>}
        </div>
        {right}
      </header>
      <div>{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium uppercase tracking-[0.06em] text-[color:var(--ops-fg-soft)] mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}

function StatusPill({ status, data }: { status: string; data: any }) {
  const tone =
    status === 'running'   ? 'accent' :
    status === 'done'      ? 'success' :
    status === 'cancelled' ? 'warn' :
    status === 'error'     ? 'danger' :
                             'muted'
  const label =
    status === 'running'   ? 'Running' :
    status === 'done'      ? 'Done' :
    status === 'cancelled' ? 'Cancelled' :
    status === 'error'     ? 'Error' :
                             'Idle'
  return (
    <div className="flex items-center gap-2">
      <Badge tone={tone as any}>
        <span className="inline-flex items-center gap-1">
          {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
          {status === 'done' && <CheckCircle2 className="w-3 h-3" />}
          {status === 'error' && <XCircle className="w-3 h-3" />}
          {label}
        </span>
      </Badge>
      {data?.costUsd != null && (
        <span className="ops-mono text-[10px] text-[color:var(--ops-fg-soft)] inline-flex items-center gap-1">
          <DollarSign className="w-3 h-3" />{Number(data.costUsd).toFixed(3)}
        </span>
      )}
      {data?.numTurns != null && (
        <span className="ops-mono text-[10px] text-[color:var(--ops-fg-soft)]">
          {data.numTurns} turns
        </span>
      )}
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'running'   ? '#1d4ed8' :
    status === 'done'      ? '#027a48' :
    status === 'cancelled' ? '#b54708' :
    status === 'error'     ? '#b42318' :
                             '#98a2b3'
  return <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
}

function fmtRelative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString()
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function EmptyTranscript({ selected }: { selected: AgentSummary | null }) {
  return (
    <div className="py-8 text-center">
      <Sparkles className="w-6 h-6 mx-auto text-[color:var(--ops-fg-soft)]" />
      <div className="mt-2 text-[13px] text-[color:var(--ops-fg-muted)]">
        Ready to dispatch{selected ? <> <span className="font-medium text-[color:var(--ops-fg)]">{selected.name}</span></> : ''}.
      </div>
      <div className="mt-1 text-[11px] text-[color:var(--ops-fg-soft)]">
        Write a prompt on the left and hit <span className="ops-kbd">Send</span>.
      </div>
    </div>
  )
}

function FinalSummary({ data, status }: { data: any; status: string }) {
  const dur = data?.durationMs != null ? `${(data.durationMs / 1000).toFixed(1)}s` : null
  return (
    <div className="px-4 py-3 border-t border-[color:var(--ops-border)] bg-[#fafbfc] flex items-center gap-3 text-[11px] flex-wrap">
      <Badge tone={status === 'done' ? 'success' : status === 'error' ? 'danger' : 'warn'}>
        {status}
      </Badge>
      {data?.exitCode != null && (
        <span className="ops-mono text-[color:var(--ops-fg-soft)]">exit {data.exitCode}</span>
      )}
      {dur && <span className="ops-mono text-[color:var(--ops-fg-soft)] inline-flex items-center gap-1"><Clock className="w-3 h-3" />{dur}</span>}
      {data?.costUsd != null && (
        <span className="ops-mono text-[color:var(--ops-fg-soft)] inline-flex items-center gap-1">
          <DollarSign className="w-3 h-3" />{Number(data.costUsd).toFixed(4)}
        </span>
      )}
      {data?.numTurns != null && (
        <span className="ops-mono text-[color:var(--ops-fg-soft)]">{data.numTurns} turns</span>
      )}
    </div>
  )
}

// ─── transcript renderer ──────────────────────────────────────────────

function TranscriptStream({ events }: { events: DispatchEvent[] }) {
  const renderable = useMemo(() => collapseEvents(events), [events])

  if (renderable.length === 0) return null
  return (
    <ol className="space-y-2.5">
      {renderable.map((node, i) => <TranscriptNode key={i} node={node} />)}
    </ol>
  )
}

type RenderNode =
  | { kind: 'system'; ts: number; text: string }
  | { kind: 'stderr'; ts: number; text: string }
  | { kind: 'assistant_text'; ts: number; text: string }
  | { kind: 'tool_use'; ts: number; name: string; input: any; id: string }
  | { kind: 'tool_result'; ts: number; toolUseId?: string; content: any; isError?: boolean }
  | { kind: 'result'; ts: number; data: any }
  | { kind: 'session_init'; ts: number; data: any }
  | { kind: 'unknown'; ts: number; data: any }

function collapseEvents(events: DispatchEvent[]): RenderNode[] {
  const out: RenderNode[] = []
  for (const ev of events) {
    if (ev.kind === 'system') {
      const d = ev.data as any
      out.push({ kind: 'system', ts: ev.ts, text: d?.event === 'started' ? `Started · pid ${d.pid}` : d?.event === 'closed' ? `Closed · exit ${d.exitCode}` : (d?.message || JSON.stringify(d)) })
      continue
    }
    if (ev.kind === 'stderr') {
      out.push({ kind: 'stderr', ts: ev.ts, text: String(ev.data).trim() })
      continue
    }
    if (ev.kind !== 'stdout') continue

    const d = ev.data
    if (!d || typeof d !== 'object') continue
    const obj = d as any

    // Skip stream_event (partial deltas) — final assistant message will arrive whole
    if (obj.type === 'stream_event') continue

    if (obj.type === 'system' && obj.subtype === 'init') {
      out.push({ kind: 'session_init', ts: ev.ts, data: obj })
      continue
    }
    if (obj.type === 'result') {
      out.push({ kind: 'result', ts: ev.ts, data: obj })
      continue
    }

    if (obj.type === 'assistant' && obj.message?.content) {
      const content = obj.message.content as any[]
      for (const block of content) {
        if (block.type === 'text' && block.text) {
          out.push({ kind: 'assistant_text', ts: ev.ts, text: block.text })
        } else if (block.type === 'tool_use') {
          out.push({ kind: 'tool_use', ts: ev.ts, name: block.name, input: block.input, id: block.id })
        } else if (block.type === 'thinking' && block.thinking) {
          out.push({ kind: 'assistant_text', ts: ev.ts, text: `💭 ${block.thinking}` })
        }
      }
      continue
    }

    if (obj.type === 'user' && obj.message?.content) {
      const content = obj.message.content as any[]
      for (const block of content) {
        if (block.type === 'tool_result') {
          out.push({
            kind: 'tool_result',
            ts: ev.ts,
            toolUseId: block.tool_use_id,
            content: block.content,
            isError: block.is_error,
          })
        }
      }
      continue
    }

    out.push({ kind: 'unknown', ts: ev.ts, data: obj })
  }
  return out
}

function TranscriptNode({ node }: { node: RenderNode }) {
  switch (node.kind) {
    case 'system':
      return (
        <li className="flex items-center gap-2 text-[11px] text-[color:var(--ops-fg-soft)]">
          <span className="ops-mono">{fmtTime(node.ts)}</span>
          <span>·</span>
          <span>{node.text}</span>
        </li>
      )
    case 'stderr':
      return (
        <li className="flex items-start gap-2 text-[11px]">
          <span className="ops-mono text-[color:var(--ops-fg-soft)] mt-0.5">{fmtTime(node.ts)}</span>
          <span className="ops-mono text-[color:var(--ops-danger)] whitespace-pre-wrap">{node.text}</span>
        </li>
      )
    case 'session_init':
      return (
        <li className="flex items-center gap-2 text-[11px] text-[color:var(--ops-fg-soft)]">
          <span className="ops-mono">{fmtTime(node.ts)}</span>
          <span>· session</span>
          <span className="ops-mono">{node.data.session_id?.slice?.(0, 8)}</span>
          {node.data.model && <span>· {node.data.model}</span>}
        </li>
      )
    case 'assistant_text':
      return (
        <li>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.06em] text-[color:var(--ops-fg-soft)] mb-1">
            <Sparkles className="w-3 h-3" /> Assistant <span className="ops-mono normal-case tracking-normal text-[color:var(--ops-fg-soft)]">{fmtTime(node.ts)}</span>
          </div>
          <div className="text-[13px] leading-relaxed text-[color:var(--ops-fg)] whitespace-pre-wrap">
            {node.text}
          </div>
        </li>
      )
    case 'tool_use':
      return (
        <li>
          <details className="ops-card overflow-hidden">
            <summary className="px-3 py-2 text-[12px] cursor-pointer flex items-center gap-2 hover:bg-[#fafbfc]">
              <Wrench className="w-3.5 h-3.5 text-[color:var(--ops-accent)]" />
              <span className="font-medium text-[color:var(--ops-fg)]">{node.name}</span>
              <span className="text-[color:var(--ops-fg-soft)] truncate min-w-0 flex-1">
                {summarizeToolInput(node.name, node.input)}
              </span>
              <span className="ops-mono text-[10px] text-[color:var(--ops-fg-soft)]">{fmtTime(node.ts)}</span>
              <ChevronDown className="w-3 h-3 text-[color:var(--ops-fg-soft)]" />
            </summary>
            <pre className="text-[11px] font-mono leading-relaxed p-3 bg-[#fafbfc] border-t border-[color:var(--ops-border)] whitespace-pre-wrap break-words max-h-[300px] overflow-auto">
              {JSON.stringify(node.input, null, 2)}
            </pre>
          </details>
        </li>
      )
    case 'tool_result':
      return (
        <li>
          <details className="ops-card overflow-hidden">
            <summary className={[
              'px-3 py-2 text-[12px] cursor-pointer flex items-center gap-2 hover:bg-[#fafbfc]',
              node.isError ? 'text-[color:var(--ops-danger)]' : '',
            ].join(' ')}>
              <FileText className="w-3.5 h-3.5 text-[color:var(--ops-fg-soft)]" />
              <span className="font-medium">tool_result{node.isError ? ' (error)' : ''}</span>
              <span className="text-[color:var(--ops-fg-soft)] truncate min-w-0 flex-1">
                {summarizeToolResult(node.content)}
              </span>
              <span className="ops-mono text-[10px] text-[color:var(--ops-fg-soft)]">{fmtTime(node.ts)}</span>
              <ChevronDown className="w-3 h-3 text-[color:var(--ops-fg-soft)]" />
            </summary>
            <pre className="text-[11px] font-mono leading-relaxed p-3 bg-[#fafbfc] border-t border-[color:var(--ops-border)] whitespace-pre-wrap break-words max-h-[400px] overflow-auto">
              {stringifyContent(node.content)}
            </pre>
          </details>
        </li>
      )
    case 'result':
      return (
        <li className="ops-card px-4 py-3 bg-[color:var(--ops-success-soft)] border-[#abefc6]">
          <div className="flex items-center gap-2 text-[12px]">
            <CheckCircle2 className="w-4 h-4 text-[color:var(--ops-success)]" />
            <span className="font-semibold text-[color:var(--ops-success)]">Result</span>
            {node.data.is_error && <span className="text-[color:var(--ops-danger)]">· error</span>}
          </div>
          {node.data.result && (
            <div className="mt-2 text-[13px] text-[color:var(--ops-fg)] whitespace-pre-wrap">
              {String(node.data.result)}
            </div>
          )}
          <div className="mt-2 flex items-center gap-3 ops-mono text-[10px] text-[color:var(--ops-fg-soft)]">
            {node.data.num_turns != null && <span>{node.data.num_turns} turns</span>}
            {node.data.duration_ms != null && <span>{(node.data.duration_ms / 1000).toFixed(1)}s</span>}
            {node.data.total_cost_usd != null && <span>${Number(node.data.total_cost_usd).toFixed(4)}</span>}
          </div>
        </li>
      )
    case 'unknown':
      return (
        <li>
          <details className="text-[11px]">
            <summary className="cursor-pointer text-[color:var(--ops-fg-soft)] inline-flex items-center gap-1">
              <ChevronDown className="w-3 h-3" />
              <span className="ops-mono">{fmtTime(node.ts)}</span> · {(node.data as any)?.type || 'event'}
            </summary>
            <pre className="mt-1 text-[10px] font-mono p-2 bg-[#fafbfc] border border-[color:var(--ops-border)] rounded whitespace-pre-wrap break-words max-h-[200px] overflow-auto">
              {JSON.stringify(node.data, null, 2)}
            </pre>
          </details>
        </li>
      )
  }
}

function summarizeToolInput(name: string, input: any): string {
  if (!input || typeof input !== 'object') return ''
  if (typeof input.file_path === 'string') return input.file_path
  if (typeof input.path === 'string') return input.path
  if (typeof input.command === 'string') return input.command.slice(0, 80)
  if (typeof input.pattern === 'string') return input.pattern
  if (typeof input.query === 'string') return input.query.slice(0, 80)
  if (typeof input.url === 'string') return input.url
  return Object.keys(input).slice(0, 3).join(', ')
}

function summarizeToolResult(content: any): string {
  const s = stringifyContent(content)
  return s.replace(/\s+/g, ' ').slice(0, 120)
}

function stringifyContent(content: any): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map((b: any) => typeof b === 'string' ? b : b?.text ?? JSON.stringify(b)).join('\n')
  }
  if (content == null) return ''
  return JSON.stringify(content, null, 2)
}
