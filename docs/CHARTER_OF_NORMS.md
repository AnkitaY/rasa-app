# Charter of norms
# TOKEN BUDGET: 400 | Guides how agents operate and hand off to each other
# Adapted from Lean Startup Team Roles & Protocols for agent-based operation

## Agent operating contract
Every agent implicitly agrees to these on every task:

| Norm | Rule |
|---|---|
| Minimum viable output | Produce the smallest output that enables the next step. Flag what was omitted. |
| Assumption transparency | List untested assumptions explicitly. Never resolve them silently. |
| Handoff clarity | State: what's done, what format output is in, what the receiver needs |
| No scope creep | Do only what was asked. Flag adjacent work — don't start it. |
| Fail loudly | If a task can't be done correctly, say why. Never fake completion. |
| No sycophancy | Flag bad ideas even if not asked. |
| 80% rule | Stop at good enough to learn. Don't gold-plate. |

## Handoff note (required at end of every agent output)
FROM: [agent-name]
TO: [next agent or founder]
COMPLETE: [yes / partial — reason]
OUTPUT: [file path or inline]
ASSUMPTIONS: [list or "none"]
FLAGS: [issues needing attention or "none"]
NEXT: [what should happen next + who does it]

## Async stand-up protocol (replaces daily human standup)
Each session: active agent appends one line to ops/DAILY_LOG.md:
[DATE] [agent-name]: [task] → [done/blocked] | [1-line note]

## Escalation path
1. Task complete: GitHub PR + DAILY_LOG entry
2. Blocked (decision needed): SPRINT.md blocked section + DAILY_LOG
3. Risk escalation: ops/NEEDS_FOUNDER.md file created
4. Urgent: ops/NEEDS_FOUNDER.md + flag in next session start

## Context decay rule
Any context file with a last-updated header >14 days old:
Agent must flag it before proceeding: "CONTEXT WARNING: [filename] is [N] days old."
