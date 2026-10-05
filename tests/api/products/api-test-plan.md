# Products API test plan

Verified on 6 October 2026: **6/6 new tests passed**; full suite **50/50**.

| Operation | Tests | Core coverage |
| --- | ---: | --- |
| GET /api/v1/products | 2 | `200` authenticated array/structure; `401` missing token. |
| GET /api/v1/products/{id} | 4 | `200` catalogue-derived product; `400` nonnumeric ID; `401` missing token; `404` absent numeric ID. |

Use catalogue-derived IDs, validate mutable fields structurally and avoid fixed
counts or UTC assumptions for local timestamps. Fixture accounts are cleaned up;
catalogue data is unchanged.

Deferred: extra token/ID variants. Product mutations need admin setup and cleanup.
Shared rules and verification: [root plan](../../../api-test-plan.md).
