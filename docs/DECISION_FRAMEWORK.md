# Decision framework
# TOKEN BUDGET: 350 | Load when any agent faces a risky or irreversible decision

## Two-door rule (reversible vs irreversible)
| Type | Criteria | Agent action |
|---|---|---|
| Reversible (two-way) | Can undo in <1hr, no user impact | Act autonomously, log in DAILY_LOG.md |
| Partially reversible | Can undo but causes friction or data work | Draft + wait 2hr for founder to review |
| Irreversible (one-way) | Deletes data, affects users, production deploy, billing | STOP — write to ops/NEEDS_FOUNDER.md, wait for explicit approval |

## Always escalate (never act autonomously)
- Any change to production database schema
- Any action affecting user accounts or billing
- Merging to main branch (agents commit to branches, founder merges)
- Any Vercel production deployment (preview is OK, production is not)
- Security configuration changes
- Any decision not reversible within one sprint

## Agent autonomy matrix
| Domain | Autonomous OK | Needs approval |
|---|---|---|
| Code | Write, test, commit to feature branch | Merge to main, deploy to production |
| Content | Draft, create | Publish live |
| Database | Read queries | Schema changes, migrations |
| GitHub | Create branch, commit, open PR | Merge PR |
| Vercel | Check deployment status | Trigger production deploy |

## 80% effort rule
Stop at the minimum output that enables the next decision or test.
Flag what was omitted. Perfect is the enemy of learning.
