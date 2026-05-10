import { spawn, ChildProcess } from 'child_process'
import { randomUUID } from 'crypto'
import { mkdir, readdir, readFile, writeFile, appendFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { OPS_PATHS } from './paths'

export type JobStatus = 'running' | 'done' | 'cancelled' | 'error'

export interface DispatchEvent {
  ts: number
  kind: 'system' | 'stdout' | 'stderr' | 'status'
  /** For 'stdout': parsed stream-json object. For 'stderr'/'system': text or descriptor. For 'status': { status, exitCode } */
  data: unknown
  raw?: string
}

export interface JobRecord {
  id: string
  agent: string
  prompt: string
  permissionMode: string
  maxBudgetUsd: number | null
  model: string | null
  status: JobStatus
  startedAt: number
  endedAt?: number
  exitCode?: number | null
  error?: string
  /** Final summary fields populated from the terminal `result` event. */
  costUsd?: number
  numTurns?: number
  durationMs?: number
}

interface LiveJob extends JobRecord {
  events: DispatchEvent[]
  subscribers: Set<(ev: DispatchEvent) => void>
  endSubscribers: Set<() => void>
  process?: ChildProcess
}

const DISPATCH_DIR = path.join(OPS_PATHS.root, 'ops', 'dispatches')

async function ensureDir() {
  if (!existsSync(DISPATCH_DIR)) await mkdir(DISPATCH_DIR, { recursive: true })
}

class JobRegistryImpl {
  jobs = new Map<string, LiveJob>()

  async start(opts: {
    agent: string
    prompt: string
    permissionMode?: string
    maxBudgetUsd?: number | null
    model?: string | null
  }): Promise<JobRecord> {
    await ensureDir()

    const id = randomUUID()
    const startedAt = Date.now()
    const permissionMode = opts.permissionMode || 'bypassPermissions'
    const maxBudgetUsd = opts.maxBudgetUsd ?? 1
    const model = opts.model || null

    const job: LiveJob = {
      id,
      agent: opts.agent,
      prompt: opts.prompt,
      permissionMode,
      maxBudgetUsd,
      model,
      status: 'running',
      startedAt,
      events: [],
      subscribers: new Set(),
      endSubscribers: new Set(),
    }
    this.jobs.set(id, job)

    // Persist meta upfront so history shows running jobs even if dev server restarts
    await this.persistMeta(job)

    const args = [
      '-p',
      '--agent', opts.agent,
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--permission-mode', permissionMode,
    ]
    if (maxBudgetUsd != null) args.push('--max-budget-usd', String(maxBudgetUsd))
    if (model) args.push('--model', model)

    // Force the child to authenticate via the Claude Max OAuth login (saved by
    // `claude /login`) instead of billing the per-token Anthropic API account.
    // The CLI prefers ANTHROPIC_API_KEY when set, so strip it (and related vars)
    // from the inherited environment. The user must have run `claude /login`
    // with their Max subscription on this machine for this to succeed.
    const childEnv: NodeJS.ProcessEnv = { ...process.env }
    delete childEnv.ANTHROPIC_API_KEY
    delete childEnv.ANTHROPIC_AUTH_TOKEN
    delete childEnv.ANTHROPIC_BASE_URL
    delete childEnv.CLAUDE_CODE_USE_BEDROCK
    delete childEnv.CLAUDE_CODE_USE_VERTEX

    let child: ChildProcess
    try {
      child = spawn('claude', args, {
        cwd: OPS_PATHS.root,
        env: childEnv,
        // shell: true is needed on Windows so .cmd/.ps1 shims for `claude` resolve
        shell: process.platform === 'win32',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      job.status = 'error'
      job.error = `Failed to spawn claude CLI: ${msg}`
      job.endedAt = Date.now()
      this.emit(job, { ts: Date.now(), kind: 'system', data: { event: 'error', message: job.error } })
      this.endJob(job)
      return this.toRecord(job)
    }

    job.process = child

    this.emit(job, {
      ts: Date.now(),
      kind: 'system',
      data: { event: 'started', pid: child.pid, cmd: ['claude', ...args].join(' ') },
    })

    // Pipe prompt over stdin to avoid shell escaping nightmares
    if (child.stdin) {
      child.stdin.write(opts.prompt)
      child.stdin.end()
    }

    // Stream stdout, parsing line-by-line as JSONL
    let stdoutBuf = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutBuf += chunk.toString('utf-8')
      const lines = stdoutBuf.split(/\r?\n/)
      stdoutBuf = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        let parsed: unknown
        try { parsed = JSON.parse(line) } catch { parsed = { raw: line, parseError: true } }
        const ev: DispatchEvent = { ts: Date.now(), kind: 'stdout', data: parsed, raw: line }
        this.emit(job, ev)

        // Capture summary fields from terminal `result` event
        if (typeof parsed === 'object' && parsed !== null) {
          const p = parsed as Record<string, unknown>
          if (p.type === 'result') {
            if (typeof p.total_cost_usd === 'number') job.costUsd = p.total_cost_usd
            if (typeof p.num_turns === 'number') job.numTurns = p.num_turns
            if (typeof p.duration_ms === 'number') job.durationMs = p.duration_ms
          }
        }
      }
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8')
      this.emit(job, { ts: Date.now(), kind: 'stderr', data: text })
    })

    child.on('error', (err) => {
      this.emit(job, { ts: Date.now(), kind: 'system', data: { event: 'process_error', message: err.message } })
    })

    child.on('close', (code) => {
      job.exitCode = code
      job.endedAt = Date.now()
      if (job.status === 'running') {
        job.status = code === 0 ? 'done' : 'error'
      }
      // Flush any leftover stdout
      if (stdoutBuf.trim()) {
        try {
          const parsed = JSON.parse(stdoutBuf)
          this.emit(job, { ts: Date.now(), kind: 'stdout', data: parsed, raw: stdoutBuf })
        } catch {
          this.emit(job, { ts: Date.now(), kind: 'stdout', data: { raw: stdoutBuf, parseError: true }, raw: stdoutBuf })
        }
      }
      this.emit(job, { ts: Date.now(), kind: 'system', data: { event: 'closed', exitCode: code, status: job.status } })
      this.endJob(job)
    })

    return this.toRecord(job)
  }

  cancel(id: string): boolean {
    const job = this.jobs.get(id)
    if (!job || job.status !== 'running') return false
    job.status = 'cancelled'
    try {
      if (job.process && !job.process.killed) {
        job.process.kill('SIGTERM')
      }
    } catch { /* swallow */ }
    return true
  }

  get(id: string): LiveJob | null {
    return this.jobs.get(id) ?? null
  }

  list(): JobRecord[] {
    return Array.from(this.jobs.values())
      .map(j => this.toRecord(j))
      .sort((a, b) => b.startedAt - a.startedAt)
  }

  /** Load any jobs persisted to disk that aren't already in memory. */
  async listWithHistory(): Promise<JobRecord[]> {
    await ensureDir()
    let files: string[] = []
    try { files = (await readdir(DISPATCH_DIR)).filter(f => f.endsWith('.meta.json')) } catch { /* */ }
    const fromDisk: JobRecord[] = []
    for (const f of files) {
      try {
        const text = await readFile(path.join(DISPATCH_DIR, f), 'utf-8')
        const meta = JSON.parse(text) as JobRecord
        if (!this.jobs.has(meta.id)) fromDisk.push(meta)
      } catch { /* skip */ }
    }
    const inMemory = this.list()
    return [...inMemory, ...fromDisk].sort((a, b) => b.startedAt - a.startedAt)
  }

  /** Load events for a completed job from its JSONL file. */
  async loadEvents(id: string): Promise<DispatchEvent[]> {
    const live = this.jobs.get(id)
    if (live) return live.events
    try {
      const text = await readFile(path.join(DISPATCH_DIR, `${id}.jsonl`), 'utf-8')
      return text.split(/\r?\n/).filter(Boolean).map(line => {
        try { return JSON.parse(line) as DispatchEvent } catch { return { ts: Date.now(), kind: 'stderr', data: line } }
      })
    } catch { return [] }
  }

  async loadJob(id: string): Promise<JobRecord | null> {
    const live = this.jobs.get(id)
    if (live) return this.toRecord(live)
    try {
      const text = await readFile(path.join(DISPATCH_DIR, `${id}.meta.json`), 'utf-8')
      return JSON.parse(text) as JobRecord
    } catch { return null }
  }

  private emit(job: LiveJob, ev: DispatchEvent) {
    job.events.push(ev)
    job.subscribers.forEach(sub => {
      try { sub(ev) } catch { /* */ }
    })
    // Async append to disk; don't block emission
    appendFile(path.join(DISPATCH_DIR, `${job.id}.jsonl`), JSON.stringify(ev) + '\n').catch(() => {})
  }

  private endJob(job: LiveJob) {
    void this.persistMeta(job)
    job.endSubscribers.forEach(sub => {
      try { sub() } catch { /* */ }
    })
    job.endSubscribers.clear()
    job.subscribers.clear()
  }

  private async persistMeta(job: LiveJob) {
    try {
      await writeFile(
        path.join(DISPATCH_DIR, `${job.id}.meta.json`),
        JSON.stringify(this.toRecord(job), null, 2),
      )
    } catch { /* */ }
  }

  private toRecord(job: LiveJob): JobRecord {
    return {
      id: job.id,
      agent: job.agent,
      prompt: job.prompt,
      permissionMode: job.permissionMode,
      maxBudgetUsd: job.maxBudgetUsd,
      model: job.model,
      status: job.status,
      startedAt: job.startedAt,
      endedAt: job.endedAt,
      exitCode: job.exitCode,
      error: job.error,
      costUsd: job.costUsd,
      numTurns: job.numTurns,
      durationMs: job.durationMs,
    }
  }
}

// Reuse a single registry across hot-reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __opsDispatchRegistry: JobRegistryImpl | undefined
}

export const registry: JobRegistryImpl =
  globalThis.__opsDispatchRegistry ?? (globalThis.__opsDispatchRegistry = new JobRegistryImpl())
