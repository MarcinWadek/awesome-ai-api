# Commerce workflow tests

## Focused reduction — 23 October 2026

User requested fewer tests focused on the most important checks. Reduce the
original 60 additions to 39: cart 4, orders 23, inventory 12. Preserve existing
baseline tests, environment routing, lifecycle cleanup and all endpoint operations.

Keep checkout persistence/totals/clearing/deductions and atomic shortage rollback;
customer isolation and admin access; owner PENDING/admin PAID cancellation,
representative SHIPPED rejection, repeat/reopen stock safeguards; inventory stock,
movement and replay/underflow checks. Remove duplicate cart peer mutations and
populated-read test; redundant owner detail (checkout already reads back); list
pagination errors; additional terminal-status variants; repeated cancellation as
a separate setup (assert it immediately after successful cancellation instead).
Keep inventory-family read authentication/role checks on list and write checks
on adjustments; defer repetitive detail/history permission and missing-resource
variants, threshold validation and adjustment missing-product checks.

Run the 50 retained commerce/cart cases (39 additions + 11 baseline), then the
full suite, typecheck and diff check. Results below are separate from the
historical 20 October delivery.

| 23 October check | Result |
| --- | --- |
| Commerce discovery | 50 cases: 39 additions (cart 4, orders 23, inventory 12) + 11 baseline cart-item cases |
| Focused staging run, four workers, zero retries | **50/50 passed**, 1.9m |
| Full api/admin suite, four workers, zero retries | **148/148 passed**, 3.0m; 75 api / 73 admin |
| Typecheck | Passed |
| `git diff --check` | Passed |
| New-file whitespace and Markdown links | Passed, 18 new files |

No fixture/client/environment changes were needed. The existing checkout, order
snapshot, roles/ownership and cleanup assertions remain strict. Both cancellation
success cases now verify that a subsequent cancellation returns 400 and preserves
restored stock and movement count. The initial delivery below is historical;
its 60-test count describes 20 October, not the current retained scope.
No application defects or cleanup failures occurred in this verification.
The unchanged traffic-detail regression returned 200 and passed all its body
assertions; the historical 500 was not reproduced. Backend deployment changes
and root cause remain unconfirmed. Raw run logs are gitignored at
`exploration-results/commerce-reduced-focused.log` and
`exploration-results/commerce-reduced-full-suite.log`.

## Original delivery — 20 October 2026

Historical implementation record, completed 20 October 2026. Evidence:
[exploration](../exploration/2026-10-20-commerce-workflow.md),
[maintained matrix](../../api-test-plan.md).

Existing catalogue/product CRUD and eleven staging cart-item tests count toward
coverage. Add focused scenarios to existing cart-item operation specs only where
missing stock/ownership/removal behavior matters; retain awesome tests unchanged.
New staging specs: cart GET/DELETE, orders POST/GET/detail/cancel/admin GET/status
PUT, inventory GET/detail/adjustments POST/movements GET. One spec per operation.
Delivered **60 additions** (cart 7, orders 33, inventory 20). The prior eleven
cart-item cases and all existing product tests count toward the maintained matrix.

1. Establish a commerce fixture using the admin fixture and a newly registered
   ordinary staging shopper. Initialize clients in fixture setup. Create products
   on demand; retain unique names before sending create requests.
2. Before any successful checkout test, implement cleanup: clear cart, rediscover
   shopper orders, cancel active orders (reset terminal statuses only on owned
   orders during teardown), verify deduction/restoration movement balance, restore
   adjustment baseline, delete user, verify order absence, delete exact-name
   products, verify product/inventory/movement absence. Aggregate independent
   cleanup failures; never delete a product with remaining order references.
   Probe assertion failure and partial setup before successful checkout coverage.
3. Checkout: persisted multi-item monetary snapshot, clearing and deductions;
   invalid address, empty cart, missing auth and stock shortage rollback. Lists:
   customer isolation/filter/pagination; admin owned-row presence/filter/pagination
   without asserting shared totals. Details: owner/admin success, peer hidden,
   auth/missing. Cancel/status: PENDING and PAID restoration, terminal rejection,
   repeat/reopen safeguards, auth/role/ownership and missing IDs.
4. Inventory: filtered list and classifications; exact detail; adjustments with
   persisted stock/movement and idempotent replay; invalid delta, negative stock,
   conflicting replay; auth/role/missing for each operation. Movement pagination,
   newest-first records and checkout/cancel correlation.
5. New tests first, then full suite (existing traffic defect retained), typecheck,
   diff check. Record defects without accepting incorrect behavior. Update this
   record and root matrix with actual statuses, counts, checks and remaining gaps.

Not a goal: exhaustive syntactic input variants, concurrency stress, unrelated
auth/email/traffic changes. Setup calls do not alone qualify as operation coverage.

## Delivered implementation

- `clients/orders.client.ts`, `clients/inventory.client.ts`, typed commerce DTOs
  and a small order snapshot assertion. JSON status enums explicitly use
  application/json; client transport errors use the existing safeRequest wrapper.
- `fixtures/commerce.fixture.ts` initializes clients and owns a disposable
  ROLE_CLIENT shopper, products, order discovery and teardown. Existing auth/admin
  fixtures and Playwright environment routing are unchanged. Stock restoration
  precedes user deletion. Catalogue discovery by exact unique name handles an
  unparsed product create; shopper order discovery handles an unparsed checkout.
  Products remain intact if order cleanup fails; independent cleanup errors are
  aggregated. Peer cart references use finally blocks before product teardown.
- Twelve new operation specs (two cart, six orders, four inventory); five cases
  extend existing cart-item specs. All use Given/When/Then steps and ascending
  response statuses. Protected-operation auth/role cases remain in their own
  specs; no expired/tampered token permutations or duplicate product CRUD added.
- Two temporary expected-failure cleanup probes independently audited teardown
  after checkout assertion failure and product-response interruption. They were
  removed before permanent checkout specs were added. No skip/fixme/expected-fail
  annotations were added to permanent tests.

## Verification

| Check | Result |
| --- | --- |
| Temporary cleanup fault probes | 2/2 passed, 19.0s, one worker, zero retries; independent resource absence audit passed |
| First order-only batch | 31 passed, 2 test-side pagination error-field mismatches; corrected from backend exception handler |
| Combined cart/orders/inventory focused batch | **71/71 passed**, 2.5m, four workers, zero retries; includes all 60 additions and prior 11 cart cases |
| Full api/admin suite | **168 passed, 1 failed**, 3.5m, four workers, zero retries; all **94 admin** tests passed, 74/75 api tests passed |
| Typecheck | Passed |
| `git diff --check` | Passed |
| New-file whitespace scan | Passed, 19 new files |

No commerce application defect found. The sole full-suite failure is the existing
[traffic detail 500](../traffic-detail-bug-report.md); its intended-200 assertion
remains active. No expected result was relaxed to accept a
defect. Reports exclude tokens/credentials; trace remains off for admin-project
tests. Raw logs remain gitignored under `exploration-results/commerce-*.log`.

Limits: checkout product-disappeared 404 cannot safely be induced through normal
API deletion because of cart/order foreign keys; defensive branch unverified.
Extra malformed-input permutations, overflow and concurrency remain deferred.
See the root matrix for current operation classifications and full-suite outcome.
All 20 operations have verified automated cases; the root matrix conservatively
marks checkout partially covered because the defensive 404 remains unverified.
No operation remains wholly missing or blocked. No claim of exhaustive coverage.
