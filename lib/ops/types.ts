export type Priority = 'HIGH' | 'MED' | 'LOW' | 'PARKED' | null

export interface Task {
  done: boolean
  id: string | null            // BUG-001, IMP-001 etc, parsed from title prefix
  title: string                // full title line (sans checkbox)
  priority: Priority
  from: string | null
  details: string[]            // indented continuation lines
  source: string               // 'inbox:engineering', 'sprint', etc.
  section: string              // section heading inside the source
  rawLine: string
}

export interface SprintMeta {
  id: string | null
  goal: string | null
  dates: string | null
  inProgress: Task[]
  ready: Task[]
  blocked: Task[]
  needsFounder: Task[]
  done: Task[]
}

export interface FounderItem {
  status: 'open' | 'resolved'
  text: string
  raw: string
}

export interface NeedsFounderItem {
  status: 'open' | 'resolved'
  body: string
}

export interface LogEntry {
  date: string
  agent: string
  task: string
  status: string         // done/blocked/etc
  note: string
  raw: string
}

export interface AgentMeta {
  name: string
  description: string
  model: string | null
  tools: string[]
  disallowedTools: string[]
  body: string
  filename: string
}

export interface Thread {
  id: string
  title: string
  status: 'open' | 'closed'
  appearances: Array<{
    source: string         // inbox:engineering, sprint:done, log, founder
    section?: string
    detail: string
    date?: string
  }>
}
