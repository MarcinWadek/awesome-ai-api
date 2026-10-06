# User reads and cart exploration

Observed on **6 October 2026** at `https://awesome.byst.re`. Contract sources:
`docs/api-docs.json`, live `/v3/api-docs`, and user/cart controllers and CartService
in `../test-secure-backend`. Two disposable `ROLE_CLIENT` accounts were used;
both were deleted through right-to-be-forgotten with `204`, including cart data.
Only test-owned carts were mutated; catalogue products were read and used as references.

| Operation | Observations |
| --- | --- |
| GET /api/v1/users | `200` array; contains caller and peer profiles. Ordinary clients have access. Registered profiles match identity, email, names and client role. |
| GET /api/v1/users/{username} | Own and peer usernames return `200`; unique absent username returns `404` with `message`. |
| GET /api/v1/cart | Fresh account returns owner username, empty items and zero totals. After adding one unit, returns product ID/quantity and catalogue price as total. |
| DELETE /api/v1/cart | Empty and populated carts return `204` with no body. Repeated clearing succeeds. Subsequent GET has zero totals; the peer populated cart remains intact. |
| Authentication, all four operations | Missing Authorization and malformed Bearer token return `401` JSON with a nonempty `message`. |

No contract discrepancies observed in these probes. Initial sandboxed network
access was denied; the successful exploration used approved network access.

Current automation scope: **9 focused tests** (list 2, username lookup 3,
cart GET 2, cart DELETE 2), reduced from the original 16. Only populated clearing
needs setup with one unit of an in-stock product; accounts
and carts are removed by fixture teardown. Product stock is not reserved by cart
addition in the reviewed backend. Catalogue changes can still affect setup or totals.
Item mutations are setup helpers, not completed endpoint coverage. Admin-specific
reads, extra token variants and cart item validation remain deferred.

Coverage: [root plan](../api-test-plan.md), [users](../tests/api/users/api-test-plan.md),
[cart](../tests/api/cart/api-test-plan.md).

Original verification on 6 October 2026: all **16 tests passed** in the targeted run
(22.3s), followed by **66/66** in the full suite (53.0s), using two workers and
zero retries. Typechecking and `git diff --check` passed. Automated fixtures also
completed account/cart teardown in both runs.

Focused revision on 6 October 2026: **9/9 affected tests passed** (9.5s);
the full suite passed **59/59** with two workers and zero retries.
Typechecking and `git diff --check` passed. Peer scenarios, repeated
clearing, populated reads and extra JWT variants are exploratory findings,
not current automation coverage.
