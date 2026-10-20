# Cart item tests

Historical implementation record, completed 20 October 2026. Evidence:
[live staging exploration](../exploration/2026-10-20-cart-items.md).
Maintained scope: [root API test plan](../../api-test-plan.md).

Delivered **11 tests** in the Playwright `admin` project:

- POST: 200 with persisted contents/totals; 400 quantity zero; 401 missing auth;
  409 quantity above owned stock. Rejections must preserve the empty cart.
- PUT: 200 replaces quantity and persists totals; 400 negative quantity;
  401 missing auth; 409 above stock. Rejections must preserve existing contents.
- DELETE: 200 removes the target and preserves a second owned item; 401 missing
  auth preserves the cart; 404 for an existing product absent from the cart.

One spec per operation under `tests/admin/cart/`, ascending statuses and
Given/When/Then steps. Extended CartClient with optional authentication for add,
typed quantity update and item deletion; protected cart transport errors using the
existing safeRequest convention. Added a small cart assertion for exact owned
contents, owner and totals. No shared fixture/configuration/dependency changes.

Clients are initialized in beforeEach. Every test uses its own authenticatedUser and
UUID-named disposable product, created by authenticatedAdmin using existing
product-test conventions. PUT starts with quantity 2. DELETE sets up only the
items required by its case. Use only staging users, tokens and product IDs.

afterEach explicitly depends on authenticatedUser and authenticatedAdmin. Clear
the regular user's cart first, then discover products by exact unique names and
delete them. Name-based recovery covers failures after server-side product
creation but before parsing/assigning its response. If cart clearing fails, do
not attempt product deletion with potentially live references. Hooks run before
the user fixture's right-to-be-forgotten teardown; fixture teardown cannot be
relied on to clear references before afterEach. Never log out/change/delete the
shared administrator. Keep credentials/tokens out of traces and diagnostics.

Validation on 20 October 2026:

| Check | Actual result |
| --- | --- |
| `npm.cmd test -- tests/admin/cart --project=admin --workers=4 --retries=0` | **11/11 passed**, 21.0s, after correcting an expected-total calculation to use integer cents |
| Temporary cleanup fault probes | **2/2 passed**, 7.5s, one worker, zero retries; expected failures after cart population and before parsing a successful product-create response |
| `npm.cmd test -- --project=api --project=admin --workers=4 --retries=0` | **108 passed, 1 failed**, 1.6m; all **34 admin tests**, including all 11 new cart tests, passed |
| `npm.cmd run typecheck` | Passed |
| `git diff --check` | Failed on pre-existing `agents.md` trailing whitespace at lines 7 and 8; file left untouched |
| Cart-scope tracked diff and new-file whitespace checks | Passed |

The full run included Agent A's five QR/traffic additions. Its sole failure was
the documented [traffic detail 500](../traffic-detail-bug-report.md), outside this
cart delivery. No cart application defect was found and no assertion was weakened.
Initial restricted-network attempts failed before endpoint assertions; successful
live runs used approved network access. The first live focused run passed 10/11:
the failure was test-side floating-point multiplication (`37.019999999999996`
versus correct server total `37.02`), fixed before the passing focused/full runs.

Temporary probes reused the POST spec's hooks, intentionally interrupted setup or
assertions, then independently checked the empty cart and absence of the unique
product name after afterEach. Both audits succeeded; fixture account teardown also
completed. The probe specs/configuration were removed and are not part of the 11
permanent cases. Their gitignored audit is `exploration-results/cart-cleanup-audit.txt`.
Standard focused/full runs also completed cart/product hooks and user teardown.
An unavailable cart-clear/catalogue endpoint can still prevent product cleanup;
the hook reports that failure rather than deleting products with live references.

Deferred cases remain in exploration; no order tests in this delivery. Owned
populated staging carts provide a prerequisite for future checkout/order tests,
which still need address/order cleanup and stock-restoration checks.
