# Cart API test plan

Contract and behavior were established through backend, saved/live OpenAPI and
[live exploration](../../../docs/exploration/2026-10-06-users-cart.md) on 6 October 2026.
The focused revision contains four tests. Targeted batch **9/9 passed**;
the full suite passed **59/59** with two workers and zero retries.
Typechecking and `git diff --check` passed.

| Operation | Tests | Coverage |
| --- | ---: | --- |
| GET /api/v1/cart | 2 | `200` new user's empty cart with owner and zero totals; `401` missing auth. |
| DELETE /api/v1/cart | 2 | `204` clears a populated cart, empty body and subsequent GET verifies zero totals; `401` missing auth. |

Clients initialize in beforeEach; tests use Given/When/Then steps and ascending
status groups. Fixture-owned disposable accounts also own cart cleanup on failure.
Only the clear happy path needs a catalogue product with at least one unit in
stock, added as one cart item. Its setup stays in the spec; no peer account,
product mutation or checkout is needed. The shared empty-cart assertion is reused.

Deferred: populated read totals, peer isolation, repeated empty clearing,
extra JWT variants, dedicated item specs, validation and stock conflicts.
POST /cart/items is used only for setup and is not marked completed.

Shared rules: [root plan](../../../api-test-plan.md).
