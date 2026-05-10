import path from 'path'

const ROOT = process.cwd()

export const OPS_PATHS = {
  root: ROOT,
  sprint: path.join(ROOT, 'SPRINT.md'),
  claudeMd: path.join(ROOT, 'CLAUDE.md'),
  needsFounder: path.join(ROOT, 'ops', 'NEEDS_FOUNDER.md'),
  dailyLog: path.join(ROOT, 'ops', 'DAILY_LOG.md'),
  inboxesDir: path.join(ROOT, 'ops', 'inbox'),
  inbox: (who: string) => path.join(ROOT, 'ops', 'inbox', who, 'tasks.md'),
  agentsDir: path.join(ROOT, '.claude', 'agents'),
  docsDir: path.join(ROOT, 'docs'),
}

export const INBOXES = ['pm', 'engineering', 'ux', 'founder'] as const
export type InboxName = (typeof INBOXES)[number]
