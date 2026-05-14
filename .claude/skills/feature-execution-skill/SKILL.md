# Feature Execution Skill

Orchestrates Phase 3 per-feature task execution. Run this inside a **lead-engineer** Claude Code session.

**Invocation:** Founder opens a `lead-engineer` session, invokes this skill, and names the feature from `SPRINT.md`.

## Step 1 — Read the plan

1. Read `SPRINT.md` to find the named feature and its tasks.
2. Read `ops/sprints/` — find the current sprint plan file and read the full task list for this feature.
3. Invoke the `superpowers:executing-plans` skill to process the task list in order.

## Step 2 — Per-task generation

For each task in the feature:

**UI task** (React component, page, styling, client-side logic):
Spawn a `frontend-engineer` subagent with:
- The task description (exact text from sprint plan)
- Relevant context file paths: `docs/UX_CONTEXT.md`, `docs/BRAND_GUIDE.md`
- Instruction: "Use the `superpowers:test-driven-development` skill. Write the failing test first, then implement. Return when tests are green and `npm run build` passes."

**API / DB task** (route handler, Supabase query, migration, server-side logic):
Spawn a `backend-engineer` subagent with:
- The task description (exact text from sprint plan)
- Relevant context file paths: `docs/ENGINEERING_CONTEXT.md` + list the 3 most recent files in `supabase/migrations/`
- Instruction: "Use the `superpowers:test-driven-development` skill. Write the failing test first, then implement. Return when tests are green and `npm run build` passes."

**Cross-cutting task** (config, env vars, CI, tooling):
Lead-engineer implements directly. Follow TDD where applicable.

## Step 3 — Per-task evaluation

After each implementation, run these checks **in order**:

### Check A: Code review
Spawn a `code-reviewer` subagent. To get the diff: ask the engineer subagent to return a list of all files it modified; read their current content and pass it to the code-reviewer along with the file paths.
- If **NEEDS_CHANGES**: pass issues back to the original engineer subagent. Re-implement. Increment code-review cycle count for this task.
- If code-review cycle count > 2 without PASS: escalate (see Escalation Format below). Continue to next task.
- If **PASS**: proceed to Check B.

### Check B: Tests
Tests should already be green (TDD). If any test is red after implementation:
- Spawn `debug-agent` subagent with: the test failure output, the test file path, the source file path.
- Debug-agent returns a fix. Apply fix. Re-run tests. Increment debug cycle count.
- If debug cycle count > 3 without green: escalate (see Escalation Format below). Continue to next task.

### Check C: Security (conditional — run only when triggered)
Trigger this check if the task touches ANY of: auth logic, `anon_id`, RLS policies, API keys, `.env` variables, user data writes.
Spawn `security-reviewer` subagent with the relevant files.
- Must return **SECURE** before proceeding.
- If **NEEDS_FIX**: have the engineer fix, re-run security review. No loop limit — security blocks must be resolved before continuing.

## Step 4 — Wrap up

After all tasks for the feature complete:
1. Update `SPRINT.md`: change `- [ ]` to `- [x]` for each completed task.
2. Commit: `git add <all changed files> && git commit -m "feat: [feature name] — [one line summary]"`
3. Push: `git push origin master`
4. Append to `ops/DAILY_LOG.md`: `- [DATE] [lead-engineer] master [feature name] — feature complete. Tasks: N completed, N escalated.`
5. Report to founder: feature name, tasks completed, any items in NEEDS_FOUNDER.md.

## Escalation Format

When a loop limit is exceeded, write to `ops/NEEDS_FOUNDER.md` and skip to the next task:

```
## [DATE] — [feature name] / [task name]
**Type:** [code-review loop limit | debug loop limit | security block]
**Issue:** [description of what failed and what was tried]
**Decision needed:** [specific question for founder]
```
