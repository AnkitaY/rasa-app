# Sprint Planning Skill

Orchestrates Phase 2: pm-agent generates a sprint plan from the design doc, lead-engineer evaluates it, loop until approved.

**Invocation:** `/sprint-planning-skill` — the founder provides:
1. Path to the design doc (output of `/ideation-skill`)
2. Sprint scope: 1-3 sentences on what's in scope for this sprint

## Step 1 — Generate sprint plan

Spawn a `pm-agent` subagent. Provide the design doc path, the founder's sprint scope statement, and these instructions:

> "Read the design doc at [path]. The founder's sprint scope is: [scope].
>
> Use the `superpowers:writing-plans` skill to produce a sprint plan. The plan must include:
> - Ordered feature list for the sprint
> - Tasks per feature with role assignments (frontend-engineer / backend-engineer / lead-engineer)
> - Task dependencies (explicit predecessor relationships, e.g. 'Task 3 requires Task 1 complete')
> - Complexity estimate per task (S / M / L — S: <2h, M: 2-4h, L: >4h)
> - Acceptance criteria per feature (these will be used by qa-skill to generate E2E tests)
>
> Save the plan to: `ops/sprints/SPRINT-[name]-[YYYY-MM-DD].md`
> (Use a 2-3 word kebab-case sprint name derived from the scope.)
>
> Then update `SPRINT.md`: add a section at the top with the sprint name, dates, and task list in checkbox format."

## Step 2 — lead-engineer evaluation

Spawn a `lead-engineer` subagent. (The sprint plan path is deterministic: `ops/sprints/SPRINT-[name]-[YYYY-MM-DD].md` where `[name]` and `[YYYY-MM-DD]` are the values the pm-agent used when saving the file. Derive this from the pm-agent's output or from the pattern.) Pass the sprint plan path and these instructions:

> "Read the sprint plan at [path]. Evaluate it against these criteria:
> 1. Task sequencing: no task depends on a later task (check all predecessor relationships)
> 2. Missing tasks: any DB migration, env var, or deployment task implied but not listed?
> 3. Technical risk: any task needing a spike (unknown tech, unclear approach)?
> 4. Role accuracy: is each task assigned to the right engineer type?
>
> Return either:
> - APPROVED
> - NEEDS_REVISION: [task N or section] → [issue] → [required fix]  (one line per issue, no prose)"

## Step 3 — Revision loop

Track loop count starting at 0.

If NEEDS_REVISION:
1. Increment loop count.
2. If loop count >= 3: stop. Present to founder with the latest NEEDS_REVISION lines from lead-engineer and the sprint plan path.
3. Spawn `pm-agent` subagent with the sprint plan path + all feedback items. Instruct it to revise the plan at the same path.
4. Return to Step 2 — re-run lead-engineer evaluation.

## Step 4 — Present to founder

When approved:
- Show the founder:
  - Sprint plan path (`ops/sprints/SPRINT-[name]-[YYYY-MM-DD].md`)
  - Total tasks in the sprint
  - A 5-bullet summary: what's in scope, total complexity, any flagged risks
- Next step prompt: "Ready to execute? Open a lead-engineer session and invoke `/feature-execution-skill` with the first feature name from SPRINT.md."
