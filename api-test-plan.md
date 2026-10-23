# API Test Plan

Keep this single root working plan current. Earlier deliveries and unrelated
backlog details remain in [api-test-plan-history.md](api-test-plan-history.md)
and the [implementation index](docs/implementation/README.md).

## Commerce workflow — scope reduced 23 October 2026

Sources: `docs/api-docs.json`, read-only backend implementation and
[focused staging exploration](docs/exploration/2026-10-20-commerce-workflow.md).
[Implementation and cleanup record](docs/implementation/commerce-workflow-tests.md).
Existing cart-item and product tests count toward coverage. Setup calls alone do
not count. “Covered” means the selected meaningful scenarios below are automated
and verified; it does not mean every possible input permutation.

The initial matrix was saved before implementation on 20 October. Current state: 19 operations
covered for the selected risks; checkout partially covered because its defensive
404 cannot safely be induced. All 20 operations have verified automated cases.

| Operation | Initial classification | Final classification / selected meaningful scenarios |
| --- | --- | --- |
| Cart GET | Partially covered | Covered: existing awesome empty/auth cases and staging cart-item persisted reads; checkout retains exact multi-item totals |
| Cart DELETE | Partially covered | Covered: awesome clear/auth retained; staging clears all owner items, preserves peer and stock |
| Cart item POST | Partially covered | Covered: existing persisted 200/400/401/409; adds 404 and repeated accumulation/combined stock rollback |
| Cart item PUT | Partially covered | Covered: existing persisted 200/400/401/409; adds zero removal |
| Cart item DELETE | Covered | Covered: existing selective removal/401/404; cart isolation retained in clear/checkout cases |
| Customer orders POST | Missing | Partially covered (defensive 404 unverified): multi-item snapshot/address/totals, persisted order, cart clearing/deductions; empty/address 400, auth 401, atomic stock-shortage 409 |
| Customer orders GET | Missing | Covered: owned rows, status filter, pagination, peer empty, auth 401 |
| Order GET detail | Missing | Covered: owner/admin 200, auth 401, peer hidden/absent 404 |
| Order POST cancel | Missing | Covered: owner PENDING/admin PAID, persisted cancellation/restoration, repeated cancellation 400 within happy paths, SHIPPED 400, auth 401, peer 403 |
| Admin orders GET | Missing | Covered: owned row, status filter and pagination across customers, auth 401, client 403 |
| Admin order status PUT | Missing | Covered: direct PAID/SHIPPED/DELIVERED/PENDING persistence, CANCELLED restoration once after reopen, SHIPPED cancellation 400, owner 403; order-family auth/missing lookup checked separately |
| Products GET catalogue | Covered | Covered: existing awesome authenticated DTO array and 401 |
| Products GET detail | Covered | Covered: existing awesome selected identity/fields and 400/401/404 |
| Admin product POST | Covered | Covered: existing staging persisted 201, validation 400, auth 401, client 403 |
| Admin product PUT | Covered | Covered: existing staging partial persistence, validation/auth/role/404 |
| Admin product DELETE | Covered | Covered: existing staging 204 then absent, auth/role/404 |
| Inventory GET list | Missing | Covered: case-insensitive search/category, stock classes/inclusive threshold, pagination/clamping, auth 401, client 403 |
| Inventory GET detail | Missing | Covered: exact identity/quantity/timestamp, threshold classification, absent 404; shared inventory read permissions checked on list |
| Inventory POST adjustments | Missing | Covered: positive/negative deltas, persisted catalogue/inventory/ledger, idempotent replay, zero 400, auth 401, client 403, underflow/conflicting replay 409 |
| Inventory GET movements | Missing | Covered: exact own records, newest-first, pagination/clamping, empty zero-stock ledger, checkout/cancel correlation; shared inventory read permissions and product lookup checked on list/detail |

### Isolation and cleanup

All new mutable commerce cases run on aitesters through the existing `admin`
project. Customer calls use disposable ordinary staging users; administrator calls
use `authenticatedAdmin`. Existing awesome tests and configuration are unchanged.
Products use UUID names. No shared catalogue mutations, environment transfers or
shared-admin logout/profile changes.

The commerce fixture registers ownership before product creation, handles partial
setup, rediscovers orders from the shopper list even if checkout parsing failed,
clears carts, cancels orders before deleting users, verifies deduction/restoration
balance, restores the disposable product adjustment baseline, deletes users and
verifies orders absent through admin reads, then deletes products and verifies
catalogue/inventory/movement absence. Terminal orders may be reset only for owned
teardown so cancellation can restore stock. Independent cleanup failures are
aggregated; products are retained if order cleanup fails. Peer carts are cleared
in finally blocks before commerce product teardown. User deletion is never relied
on to restore stock. Credentials/tokens are excluded from traces and diagnostics.

Two temporary cleanup fault probes passed (2/2, 19.0s, one worker, no retries):
assertion failure after checkout and interruption before parsing a created product.
Independent post-teardown checks verified user/order/product/inventory absence.
Probe specs were removed; they are not part of the permanent added test count.

### Focused reduction and verification — 23 October

At the user's request, reduced the original additions from **60 to 39** (35%
fewer): cart 4, orders 23, inventory 12. Removed 21 standalone cases, mostly
repeated permissions, secondary input/status variants and duplicate cart/detail
checks. Repeated cancellation still asserts 400, unchanged stock and unchanged
movement count immediately after successful cancellation. All 20 operations and
the key checkout, ownership, role, restoration and inventory risks remain covered
by the selected cases. Existing awesome/product/cart baseline tests are unchanged.

Discovery: **50 commerce tests** (39 additions + 11 baseline cart-item cases).
Focused staging run: **50/50 passed**, 1.9m, four workers, zero retries.
Full regression: **148/148 passed**, 3.0m, four workers, zero retries
(75 api / 73 admin). Typecheck, `git diff --check`, new-file whitespace and
Markdown link checks passed. The unchanged traffic-detail 200 case also passed;
the 20 October 500 was not reproduced.

### Historical verification — 20 October

Added **60 permanent tests**: cart 7, customer/admin orders 33, inventory 20.
The prior 11 staging cart-item tests and all existing products tests are retained.
First order batch: 31 passed, two test-side pagination error-field mismatches;
corrected against backend exception handling (`error`, not `message`). No commerce
application defect identified. Final verification (four workers, zero retries):

| Check | Actual result |
| --- | --- |
| Focused cart/orders/inventory | **71/71 passed**, 2.5m (60 additions + 11 retained cases) |
| Full api/admin suite | **168 passed, 1 failed**, 3.5m; all **94 admin** cases passed, 74/75 api cases passed |
| Typecheck | Passed |
| `git diff --check` | Passed |
| New-file whitespace check | Passed, 19 new files |

The sole full-suite failure is the existing traffic detail 500, outside commerce.
Its intended-200 assertion stays active. All commerce teardown checks completed.

```powershell
npm.cmd test -- tests/admin/cart tests/admin/orders tests/admin/inventory --project=admin --workers=4 --retries=0
npm.cmd test -- --project=api --project=admin --workers=4 --retries=0
npm.cmd run typecheck
git diff --check
```

### Remaining boundaries

- **Blocked scenario: checkout product-disappeared 404**. No safe probe: a cart product is protected by a database foreign key;
  deleting a referenced product is not a safe supported setup. This defensive
  branch remains unverified. Missing resources are covered independently by
  cart add/update/delete, product, order and inventory operations.
- Additional malformed IDs/tokens, every DTO validation combination, overflow,
  requestId conflict by changed delta (changed reason covered), concurrency and
  load are deferred. These are not prerequisites for the selected workflow.
- Reduction deferrals: separate customer/admin list pagination errors, DELIVERED
  and repeated-CANCELLED status rejection variants, per-operation cart peer
  mutations, inventory threshold validation and detail/history permission errors,
  adjustment/history missing product, status missing auth/ID and cancel missing
  ID. Representative family authentication, roles, ownership and missing-resource
  checks remain. Historical live observations are preserved in the records.
- Administrator order-list assertions discover only the generated order and do
  not assume shared order counts. Read responses are not saved as attachments.

## Other coverage and defect records

The existing 109-test baseline comprised 75 awesome `api` tests and 34 aitesters
`admin` tests. Auth signup/signin/refresh/logout; users/profile and staging CRUD;
product reads/CRUD; carts; prompt reads/updates; QR; traffic; docs/Swagger; and 11
Ollama tool/streaming cases remain in their existing environments.

- [Historical traffic found-entry detail 500](docs/traffic-detail-bug-report.md):
  not reproduced on 23 October; the unchanged intended-200 test passed its body
  checks. Root cause/deployment change unconfirmed. Unknown-ID 404 is covered.
- [QR JSON-only Accept defect](docs/qr-accept-bug-report.md): tests use the
  documented compatible image/png, application/json Accept header.
- [Prompt parsing/type defects](docs/prompt-bug-report.md) and
  [Ollama mock catalogue/prose inconsistency](docs/ollama-mock-bug-report.md)
  remain recorded. See their historical implementation records for limits.
- Deferred outside commerce: password reset success requires an observable token;
  email side effects require a controlled sink/polling window; missing-user PUT,
  dedicated right-to-be-forgotten, MFA, SSO, real upstream Ollama failures and
  incremental stream latency remain backlog.

Rules: one spec per operation, clients initialized in setup, Given/When/Then
steps, ascending expected statuses, new tests before full suite, then typecheck
and diff checks. Add only distinct business-risk coverage and preserve defects
as failures rather than weakening expectations.
