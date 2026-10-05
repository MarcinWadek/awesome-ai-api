# Users API test plan

Verified on 6 October 2026: **12/12 new prompt tests passed**; full suite **50/50**.
Signup, signin, me, refresh and logout are also covered.

| Operation | Tests | Core coverage |
| --- | ---: | --- |
| GET chat-system-prompt | 2 | `200` default string; `401` missing token. |
| PUT chat-system-prompt | 4 | `200` persistence/user and prompt isolation; `200` null reset; `400` oversized input preserves value; `401` missing token. |
| GET tool-system-prompt | 2 | Same GET coverage with `toolSystemPrompt`. |
| PUT tool-system-prompt | 4 | Same PUT coverage with `toolSystemPrompt`. |

All paths use `/api/v1/users/`. Fixtures own account cleanup; the lazy peer is
used only for isolation. PUT echoes a reset value; GET returns the effective default.

Deferred: other reset inputs, accepting length boundary, extra token variants and
[known parsing/type bugs](../../../docs/prompt-bug-report.md). User list/lookup,
edit/delete, password and email-event tests remain unstarted.

Shared rules and verification: [root plan](../../../api-test-plan.md).
