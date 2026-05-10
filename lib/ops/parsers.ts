import fs from 'fs/promises'
import path from 'path'
import { OPS_PATHS, INBOXES } from './paths'
import type {
  Task, Priority, SprintMeta, FounderItem,
  NeedsFounderItem, LogEntry, AgentMeta, Thread,
} from './types'

async function readSafe(file: string): Promise<string> {
  try { return await fs.readFile(file, 'utf-8') } catch { return '' }
}

function parsePriority(s: string | undefined): Priority {
  if (!s) return null
  const m = s.match(/HIGH|MED|LOW|PARKED/i)
  return (m ? m[0].toUpperCase() : null) as Priority
}

const TASK_ID_RE = /^([A-Z]{2,5}-\d+|FIX|IMP)\b/

/**
 * Parse a markdown file with `## Section` headings and `- [ ]` / `- [x]` task
 * lines. Continuation lines (indented under a task) are collected as details.
 * Returns tasks tagged with their containing section + the source label.
 */
export function parseMarkdownTasks(text: string, source: string): Task[] {
  const tasks: Task[] = []
  let section = ''
  let current: Task | null = null
  const lines = text.split(/\r?\n/)

  for (const raw of lines) {
    // Section heading
    const h = raw.match(/^#{2,3}\s+(.*)/)
    if (h) {
      current = null
      section = h[1].trim()
      continue
    }

    // Skip blank/comment lines but flush continuation
    if (!raw.trim()) { current = null; continue }
    if (raw.trim().startsWith('#')) { current = null; continue }

    const taskMatch = raw.match(/^- \[( |x|X)\]\s+(.*)$/)
    if (taskMatch) {
      const done = taskMatch[1].toLowerCase() === 'x'
      const fullTitle = taskMatch[2].trim()
      // Pull pipe-delimited fields off the end: ... | Priority: HIGH | From: founder
      let title = fullTitle
      let priority: Priority = null
      let from: string | null = null
      const parts = fullTitle.split(/\s+\|\s+/)
      if (parts.length > 1) {
        title = parts[0]
        for (const p of parts.slice(1)) {
          if (/^Priority:/i.test(p)) priority = parsePriority(p.replace(/^Priority:\s*/i, ''))
          else if (/^From:/i.test(p)) from = p.replace(/^From:\s*/i, '').trim()
          else if (/^Urgency:/i.test(p)) priority = parsePriority(p.replace(/^Urgency:\s*/i, ''))
        }
      }
      const idMatch = title.match(TASK_ID_RE)
      const id = idMatch ? idMatch[0] : null
      // Strip "ID:" prefix from title if present
      const cleanTitle = title.replace(/^([A-Z]{2,5}-\d+|FIX|IMP):\s*/, '').trim()

      current = {
        done,
        id,
        title: cleanTitle || title,
        priority,
        from,
        details: [],
        source,
        section,
        rawLine: raw,
      }
      tasks.push(current)
      continue
    }

    // Continuation line (indented bullet/text under a task)
    if (current && /^\s/.test(raw)) {
      current.details.push(raw.replace(/^\s+/, '').replace(/^- /, ''))
      continue
    }

    // Anything else — drop the open task
    current = null
  }
  return tasks
}

export async function loadInbox(who: string): Promise<Task[]> {
  const text = await readSafe(OPS_PATHS.inbox(who))
  return parseMarkdownTasks(text, `inbox:${who}`)
}

export async function loadAllInboxes(): Promise<Record<string, Task[]>> {
  const out: Record<string, Task[]> = {}
  await Promise.all(INBOXES.map(async (who) => { out[who] = await loadInbox(who) }))
  return out
}

export async function loadSprint(): Promise<SprintMeta & { allTasks: Task[] }> {
  const text = await readSafe(OPS_PATHS.sprint)
  const tasks = parseMarkdownTasks(text, 'sprint')

  const idMatch = text.match(/Sprint:\s*([^\s|]+)/)
  const goalMatch = text.match(/Goal:\s*(.+)/)
  const datesMatch = text.match(/Dates:\s*([^\n]+)/)

  const bySection = (name: RegExp) =>
    tasks.filter(t => name.test(t.section))

  return {
    id: idMatch?.[1] ?? null,
    goal: goalMatch?.[1]?.trim() ?? null,
    dates: datesMatch?.[1]?.trim() ?? null,
    inProgress: bySection(/^In progress/i),
    ready: bySection(/^Ready/i),
    blocked: bySection(/^Blocked/i),
    needsFounder: bySection(/^Needs founder/i),
    done: bySection(/^Done/i),
    allTasks: tasks,
  }
}

export async function loadFounderQueue(): Promise<{ open: Task[]; resolved: Task[] }> {
  const text = await readSafe(OPS_PATHS.inbox('founder'))
  const tasks = parseMarkdownTasks(text, 'inbox:founder')
  return {
    open: tasks.filter(t => /^Open/i.test(t.section) && !t.done),
    resolved: tasks.filter(t => /^Resolved/i.test(t.section) || t.done),
  }
}

export async function loadNeedsFounder(): Promise<NeedsFounderItem[]> {
  const text = await readSafe(OPS_PATHS.needsFounder)
  const items: NeedsFounderItem[] = []
  const sections = text.split(/^##\s+/m)
  for (const sec of sections) {
    const [head, ...rest] = sec.split('\n')
    if (!head) continue
    const status = /open/i.test(head) ? 'open' : /resolved/i.test(head) ? 'resolved' : null
    if (!status) continue
    const body = rest.join('\n').replace(/\(agents append here\)|\(founder moves items here[^)]*\)/g, '').trim()
    if (!body) continue
    // Each item is a bullet block; split crudely by leading '- '
    const blocks = body.split(/\n(?=- )/)
    for (const b of blocks) {
      if (b.trim()) items.push({ status, body: b.trim() })
    }
  }
  return items
}

const LOG_RE = /^(\d{4}-\d{2}-\d{2})\s+([\w-]+):\s+(.+?)(?:\s+→\s+(\w+))?(?:\s+\|\s+(.*))?$/

export async function loadDailyLog(): Promise<LogEntry[]> {
  const text = await readSafe(OPS_PATHS.dailyLog)
  const out: LogEntry[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = line.match(LOG_RE)
    if (!m) continue
    out.push({
      date: m[1],
      agent: m[2],
      task: m[3].trim(),
      status: (m[4] || '').toLowerCase(),
      note: (m[5] || '').trim(),
      raw,
    })
  }
  // newest first
  return out.reverse()
}

type FrontmatterValue = string | string[]

function parseFrontmatter(text: string): { meta: Record<string, FrontmatterValue>; body: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return { meta: {}, body: text }
  const [, fmRaw, body] = m
  const meta: Record<string, FrontmatterValue> = {}
  const lines = fmRaw.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const kv = line.match(/^([\w-]+):\s*(.*)$/)
    if (!kv) { i++; continue }
    const key = kv[1]
    const val: string = kv[2]
    if (val === '>' || val === '|') {
      // Folded/literal block scalar — collect indented lines
      const buf: string[] = []
      i++
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i] === '')) {
        buf.push(lines[i].replace(/^  /, ''))
        i++
      }
      meta[key] = buf.join(val === '>' ? ' ' : '\n').trim()
      continue
    }
    if (val.startsWith('[') && val.endsWith(']')) {
      meta[key] = val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean)
    } else {
      meta[key] = val.trim()
    }
    i++
  }
  return { meta, body: body.trim() }
}

export async function loadAgents(): Promise<AgentMeta[]> {
  const dir = OPS_PATHS.agentsDir
  let files: string[] = []
  try { files = (await fs.readdir(dir)).filter(f => f.endsWith('.md')) } catch { return [] }
  const out: AgentMeta[] = []
  const asString = (v: FrontmatterValue | undefined): string => Array.isArray(v) ? v.join(', ') : (v ?? '')
  const asList = (v: FrontmatterValue | undefined): string[] => Array.isArray(v) ? v : []

  for (const f of files) {
    const text = await readSafe(path.join(dir, f))
    const { meta, body } = parseFrontmatter(text)
    out.push({
      name: asString(meta.name) || f.replace(/\.md$/, ''),
      description: asString(meta.description).replace(/\s+/g, ' ').trim(),
      model: asString(meta.model) || null,
      tools: asList(meta.tools),
      disallowedTools: asList(meta.disallowed_tools),
      body,
      filename: f,
    })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export async function loadAgent(name: string): Promise<AgentMeta | null> {
  const all = await loadAgents()
  return all.find(a => a.name === name) || null
}

/**
 * Aggregate every appearance of a given task ID across inboxes, sprint, log,
 * founder queue. Returns one Thread per ID with appearances listed chronologically
 * (sprint Done > inbox Processed > daily log).
 */
export async function loadThreads(): Promise<Thread[]> {
  const [inboxes, sprint, log] = await Promise.all([
    loadAllInboxes(),
    loadSprint(),
    loadDailyLog(),
  ])

  const threads = new Map<string, Thread>()

  function ensure(id: string, fallbackTitle: string): Thread {
    let t = threads.get(id)
    if (!t) {
      t = { id, title: fallbackTitle, status: 'open', appearances: [] }
      threads.set(id, t)
    }
    return t
  }

  function addTask(t: Task) {
    if (!t.id) return
    const th = ensure(t.id, t.title)
    if (!th.title || th.title.length < t.title.length) th.title = t.title
    th.appearances.push({
      source: t.source,
      section: t.section,
      detail: `${t.done ? '[done]' : '[open]'} ${t.title}${t.priority ? ` · ${t.priority}` : ''}`,
    })
    if (t.done) th.status = th.appearances.some(a => a.detail.startsWith('[open]')) ? th.status : 'closed'
  }

  for (const tasks of Object.values(inboxes)) tasks.forEach(addTask)
  sprint.allTasks.forEach(addTask)

  for (const e of log) {
    const idMatch = e.task.match(TASK_ID_RE)
    if (!idMatch) continue
    const th = ensure(idMatch[0], e.task)
    th.appearances.push({
      source: 'log',
      detail: `${e.agent}: ${e.task}${e.status ? ` → ${e.status}` : ''}${e.note ? ` | ${e.note}` : ''}`,
      date: e.date,
    })
  }

  // Compute final status: closed if every task appearance is done AND no "open" inbox entry exists
  const result = Array.from(threads.values())
  for (const th of result) {
    const open = th.appearances.some(a => a.detail.startsWith('[open]'))
    th.status = open ? 'open' : 'closed'
  }

  return result.sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Convenience aggregator for the overview page.
 */
export async function loadOverview() {
  const [inboxes, sprint, log, agents, needs] = await Promise.all([
    loadAllInboxes(),
    loadSprint(),
    loadDailyLog(),
    loadAgents(),
    loadNeedsFounder(),
  ])

  const allTasks: Task[] = [
    ...Object.values(inboxes).flat(),
    ...sprint.allTasks,
  ]

  const open = allTasks.filter(t => !t.done)
  const high = open.filter(t => t.priority === 'HIGH')
  const blocked = sprint.blocked.filter(t => !t.done)
  const inProgress = sprint.inProgress.filter(t => !t.done)
  const needsFounderOpen = needs.filter(n => n.status === 'open')

  // Count completed entries in last 7 days from daily log
  const now = Date.now()
  const week = 1000 * 60 * 60 * 24 * 7
  const recent7d = log.filter(e => {
    const ts = Date.parse(e.date)
    return Number.isFinite(ts) && now - ts <= week
  })

  return {
    sprint: {
      id: sprint.id,
      goal: sprint.goal,
      dates: sprint.dates,
      counts: {
        inProgress: inProgress.length,
        ready: sprint.ready.filter(t => !t.done).length,
        blocked: blocked.length,
        done: sprint.done.length,
      },
    },
    counts: {
      openTasks: open.length,
      highPriority: high.length,
      needsFounder: needsFounderOpen.length,
      agents: agents.length,
      logEntries7d: recent7d.length,
    },
    needsFounder: needsFounderOpen,
    latestLog: log.slice(0, 8),
    inboxDepth: Object.fromEntries(
      Object.entries(inboxes).map(([k, v]) => [k, v.filter(t => !t.done && !/^Processed/i.test(t.section)).length])
    ),
  }
}

// Re-export types for convenience.
export type { FounderItem }
