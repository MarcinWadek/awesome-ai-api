# Users API test plan

Previous batch on 6 October 2026: **12/12 prompt tests passed**; full suite **50/50**.
Signup, signin, me, refresh and logout are also covered.

| Operation | Tests | Core coverage |
| --- | ---: | --- |
| GET /api/v1/users | 2 | `200` array includes registered profile without credentials; `401` missing auth. |
| GET /api/v1/users/{username} | 3 | `200` registered profile; `401` missing auth; `404` unique unregistered username. |
| GET chat-system-prompt | 2 | `200` default string; `401` missing token. |
| PUT chat-system-prompt | 4 | `200` persistence/user and prompt isolation; `200` null reset; `400` oversized input preserves value; `401` missing token. |
| GET tool-system-prompt | 2 | Same GET coverage with `toolSystemPrompt`. |
| PUT tool-system-prompt | 4 | Same PUT coverage with `toolSystemPrompt`. |

All paths use `/api/v1/users/`. Fixtures own account cleanup; the lazy peer is
used only for prompt isolation. PUT echoes a reset value; GET returns the effective default.

Deferred: other reset inputs, accepting length boundary, extra token variants and
[known parsing/type bugs](../../../docs/prompt-bug-report.md). User edit/delete,
password and email-event tests remain unstarted.

User list/lookup now contains five focused tests after
[exploration](../../../docs/users-cart-exploration.md) on 6 October 2026.
Targeted revision batch **9/9 passed**; the full suite passed **59/59** with two workers and zero retries.
Typechecking and `git diff --check` passed. Fixtures own account cleanup; clients initialize in beforeEach.
Peer/admin reads and extra token variants are deferred; existing auth/me tests
cover shared authentication variants. The absent username uses a fresh UUID and
is never registered, avoiding a redundant list request.

Shared rules and verification: [root plan](../../../api-test-plan.md).
