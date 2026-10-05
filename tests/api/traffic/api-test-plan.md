# Traffic API test plan

Verified on 6 October 2026: **6/6 new tests passed**; full suite **50/50**.

| Operation | Tests | Core coverage |
| --- | ---: | --- |
| GET /api/v1/traffic/info | 3 | `200` public defaults; `200` session topic; `400` invalid session. |
| GET /api/v1/traffic/logs | 3 | `200` public page structure; `200` session pagination/isolation/order; `400` negative page. |

Public access depends on legacy mode. Controlled pagination uses three info
requests in a unique session and one in another; logs reads are excluded from
capture. Never assert shared totals or attach raw traffic; traces are off.

Deferred: filters, size clamping, time bounds and extra invalid-input/token cases.
Shared rules and verification: [root plan](../../../api-test-plan.md).
