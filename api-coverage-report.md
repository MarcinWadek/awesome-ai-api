# API coverage and test status report

Reviewed: **23 October 2026**. Implementation base revision: `f92f0a0`;
account lifecycle changes were reviewed in the working tree.
This report replaces both former root test plans and is the single maintained
source for developer-facing coverage, test status and next actions.
Detailed delivery history remains in the [exploration reports](docs/exploration/README.md)
and [implementation records](docs/implementation/README.md).

## Coverage summary and measurement

**43 of 53 operations have functional automated tests: 81.1% endpoint coverage.**
**10 operations (18.9%) lack those tests**; the complete list appears below.

| Metric | Status |
| --- | --- |
| Operations in the saved OpenAPI contract | 53 across 43 paths |
| Operations with functional automated tests | 43 / 53 — **81.1%** |
| Operations without functional automated tests | 10 / 53 — **18.9%** |
| Tests discovered by Playwright | **153** in 47 files: 80 `api`, 73 `admin` |
| Latest recorded full regression | **153/153 passed**, 23 October 2026, 2.9 min, 4 workers, 0 retries |

The denominator includes every HTTP operation in [docs/api-docs.json](docs/api-docs.json).
An endpoint is an **HTTP method + path** pair: GET and DELETE on the same URL
count separately; different resource IDs do not create new endpoints.
The numerator includes operations exercised with behavioral assertions in active
[tests/api](tests/api) or [tests/admin](tests/admin) specs. Duplicates across
projects count once. Clients, setup, cleanup, manual exploration and checks of
OpenAPI declarations alone do not increase this numerator.

**81.1% does not mean code coverage or complete scenario, response-code or
permission coverage.** An operation with tests can still have important gaps;
these are listed below. Scenario coverage has no percentage because there is no
complete, agreed scenario inventory. Backend line and branch coverage are not
measured here.

The report combines two environments: `api` defaults to
`https://awesome.byst.re`; `admin` defaults to `https://aitesters.byst.re`.
The `admin` project also exercises ordinary staging customers, including checkout.
The aggregate 81.1% does not establish equivalent coverage in each environment.
Addresses come from [configuration](support/config.ts) and can be overridden by
environment variables. The scope is the saved REST contract; this is not a claim
that it inventories the current deployment, profile-specific endpoints such as
the local outbox, GraphQL or gRPC. Those interfaces are outside the denominator.

## Coverage by area

| Area | Operations with tests / total | Without tests | Functional tests |
| --- | --- | --- | --- |
| Authentication, passwords, MFA and SSO | 4 / 13 | 9 | 20 |
| Users, account deletion and email events | 7 / 7 | 0 | 23 |
| User prompts | 4 / 4 | 0 | 12 |
| Products | 5 / 5 | 0 | 19 |
| Cart | 5 / 5 | 0 | 19 |
| Orders | 6 / 6 | 0 | 23 |
| Inventory | 4 / 4 | 0 | 12 |
| Traffic | 3 / 3 | 0 | 8 |
| Ollama | 4 / 4 | 0 | 11 |
| QR | 1 / 1 | 0 | 3 |
| Email sending | 0 / 1 | 1 | 0 |
| **REST total** | **43 / 53** | **10** | **150** |

The other **3 tests** cover two technical endpoints outside the saved contract's
`paths`: [GET /v3/api-docs](tests/api/docs/documentation.spec.ts) (2 tests) and
[GET /swagger-ui/index.html](tests/api/docs/swagger-ui.spec.ts) (1 test).
They verify the document, authentication declarations and Swagger UI HTML.
They do not execute the 53 business operations and therefore do not give those
operations functional coverage.

## Operations without functional tests — complete list

Priorities indicate a recommended sequence. The proposed cases below are not
implemented; confirm expected behavior before adding them.

| Operation | Current status | Next action and dependencies |
| --- | --- | --- |
| `POST /api/v1/users/password/forgot` | **Missing** | **P1:** generic response for known and unknown identifiers without account enumeration; use an owned account and controlled recipient. |
| `POST /api/v1/users/password/reset` | **Missing** | **P1:** invalid-token rejection first; success requires an observable reset token. Verify new-password login, rejection of the old password and refresh-token revocation. |
| `GET /api/v1/users/2fa/status` | **Missing** | **P2:** fresh-account state and missing JWT, then state after MFA activation. |
| `POST /api/v1/users/2fa/setup` | **Missing** | **P2:** start enrollment on a disposable account; needs a controlled TOTP secret and safe cleanup. |
| `POST /api/v1/users/2fa/confirm` | **Missing** | **P2:** valid/invalid code and persisted activation; depends on setup/TOTP. |
| `POST /api/v1/users/signin/2fa` | **Missing** | **P2:** complete a challenge using TOTP/recovery and reject an invalid code; requires enabled MFA. |
| `POST /api/v1/users/2fa/recovery-codes` | **Missing** | **P2:** replace codes, invalidate old codes and verify single use; requires enabled MFA. |
| `POST /api/v1/users/2fa/disable` | **Missing** | **P2:** disable MFA and verify status/login changes using only an owned account. |
| `POST /api/v1/email` | **Missing** | **P2:** permissions and validation, then event/delivery checks with a controlled sink and bounded polling. An HTTP response alone does not prove delivery. |
| `POST /api/v1/users/sso/exchange` | **Missing** | **P3:** success and invalid-token cases after establishing a test IdP, valid OIDC ID token, issuer/audience configuration and cleanup. |

All 10 operations above lack direct functional regression tests. Manual
[password/email exploration on 23 October](docs/exploration/2026-10-23-password-email.md)
confirmed useful cases but does not count as automated coverage. Appearing in the
[OpenAPI policy](support/contracts/openapi-policy.ts) does not change that classification.

Password/email dependency evidence: [backend and deployment review](docs/exploration/2026-10-07-parallel-delivery.md).
Token echo and outbox availability depend on the active profile and must be
confirmed on the target environment. Lack of a token blocks successful reset,
not every negative case. MFA tests must not require changing the shared admin's MFA.
Current runtime evidence: awesome returned null reset tokens; a separate staging
outbox request returned 403 with no configured outbox key. No accessible token
channel or completed sink delivery was established. Exact deployment profiles
and the outbox denial cause remain unconfirmed.

## Operations with tests — complete matrix

Each row identifies an operation with active tests, not a fully tested feature.
Spec links provide coverage evidence. Response codes mentioned below describe
asserted cases, not every response declared in OpenAPI.

| Operation | Automated behavior checks | Spec / project |
| --- | --- | --- |
| `POST /api/v1/users/signup` | Registration and client login, required fields, duplicate username/email | [signup](tests/api/users/signup.spec.ts) / api |
| `POST /api/v1/users/signin` | Usable token and identity, invalid credentials, empty object, stale Bearer; admin role/session | [signin](tests/api/users/signin.spec.ts) / api; [admin](tests/admin/users/signin.spec.ts) / admin |
| `POST /api/v1/users/refresh` | Rotation and usable session; absent/blank token, unknown token, access JWT as refresh, reuse, stale Bearer | [refresh](tests/api/users/refresh.spec.ts) / api |
| `POST /api/v1/users/logout` | Empty 200, refresh revocation across sessions, fresh session after login, 401 | [logout](tests/api/users/logout.spec.ts) / api |
| `GET /api/v1/users/me` | New account identity; missing JWT, malformed token and altered signature | [me](tests/api/users/me.spec.ts) / api |
| `GET /api/v1/users` | List contains registered profile; 401 | [users](tests/api/users/index.get.spec.ts) / api |
| `GET /api/v1/users/{username}` | Own profile, 401, absent user 404 | [username GET](tests/api/users/username.get.spec.ts) / api |
| `PUT /api/v1/users/{username}` | Owner/admin persisted updates; validation 400, missing JWT 401, peer 403 | [username PUT](tests/admin/users/username.put.spec.ts) / admin |
| `DELETE /api/v1/users/{username}` | Admin deletion: 204 and absent profile; 401, client/owner 403, absent user 404 | [username DELETE](tests/admin/users/username.delete.spec.ts) / admin |
| `DELETE /api/v1/users/{username}/right-to-be-forgotten` | Owner 204/empty body, independent observer 404, saved refresh token rejected; missing JWT 401 and peer 403 preserve target | [right-to-be-forgotten](tests/api/users/right-to-be-forgotten.delete.spec.ts) / api |
| `GET /api/v1/users/me/email-events` | Fresh account has an empty JSON array; missing authentication 401 | [email events](tests/api/users/me.email-events.get.spec.ts) / api |
| `GET /api/v1/users/chat-system-prompt` | New account's default prompt, 401 | [chat GET](tests/api/users/chat-system-prompt.get.spec.ts) / api |
| `PUT /api/v1/users/chat-system-prompt` | Unicode, persistence and isolation, null reset, oversized prompt 400, 401 | [chat PUT](tests/api/users/chat-system-prompt.put.spec.ts) / api |
| `GET /api/v1/users/tool-system-prompt` | New account's default prompt, 401 | [tool GET](tests/api/users/tool-system-prompt.get.spec.ts) / api |
| `PUT /api/v1/users/tool-system-prompt` | Unicode, persistence and isolation, null reset, oversized prompt 400, 401 | [tool PUT](tests/api/users/tool-system-prompt.put.spec.ts) / api |
| `GET /api/v1/products` | DTO array and product fields; 401 | [products GET](tests/api/products/index.get.spec.ts) / api |
| `GET /api/v1/products/{id}` | Selected product identity/fields; 400, 401, 404 | [product GET](tests/api/products/id.get.spec.ts) / api |
| `POST /api/v1/products` | Persisted creation 201, validation 400, 401, client 403 | [product POST](tests/admin/products/index.post.spec.ts) / admin |
| `PUT /api/v1/products/{id}` | Persisted partial update preserves omitted fields; 400, 401, 403, 404 | [product PUT](tests/admin/products/id.put.spec.ts) / admin |
| `DELETE /api/v1/products/{id}` | 204 and absent product; 401, 403, 404 | [product DELETE](tests/admin/products/id.delete.spec.ts) / admin |
| `GET /api/v1/cart` | Empty cart and 401; populated contents/totals also asserted in staging workflows | [cart GET](tests/api/cart/index.get.spec.ts) / api; [checkout](tests/admin/orders/index.post.spec.ts) / admin |
| `DELETE /api/v1/cart` | Removes contents, 401; staging preserves peer cart and stock | [clear](tests/api/cart/index.delete.spec.ts) / api; [staging clear](tests/admin/cart/index.delete.spec.ts) / admin |
| `POST /api/v1/cart/items` | Persisted addition/totals, accumulation; 400, 401, missing product 404, stock/rollback 409 | [item POST](tests/admin/cart/items.post.spec.ts) / admin |
| `PUT /api/v1/cart/items/{productId}` | Quantity/totals update, zero removes; negative quantity 400, 401, stock 409 | [item PUT](tests/admin/cart/items.productId.put.spec.ts) / admin |
| `DELETE /api/v1/cart/items/{productId}` | Removes only the selected item, 401, absent item 404 | [item DELETE](tests/admin/cart/items.productId.delete.spec.ts) / admin |
| `POST /api/v1/orders` | Multi-item checkout: snapshot, address, totals, persistence, cart clearing and stock; 400, 401, atomic rollback 409 | [checkout](tests/admin/orders/index.post.spec.ts) / admin |
| `GET /api/v1/orders` | Own orders, status filter, pagination, customer isolation; 401 | [orders GET](tests/admin/orders/index.get.spec.ts) / admin |
| `GET /api/v1/orders/{id}` | Admin detail, 401, peer hidden 404, absent ID 404; owner readback in checkout | [order GET](tests/admin/orders/id.get.spec.ts), [checkout](tests/admin/orders/index.post.spec.ts) / admin |
| `POST /api/v1/orders/{id}/cancel` | Owner PENDING/admin PAID, persistence and stock restored once; repeat/SHIPPED 400, 401, peer 403 | [cancel](tests/admin/orders/id.cancel.post.spec.ts) / admin |
| `GET /api/v1/orders/admin` | Owned data discovered across customers, filtering and pagination; 401, client 403 | [admin orders](tests/admin/orders/admin.get.spec.ts) / admin |
| `PUT /api/v1/orders/{id}/status` | Status persistence, CANCELLED restores stock once even after reopen; SHIPPED to CANCELLED 400, client 403 | [status PUT](tests/admin/orders/id.status.put.spec.ts) / admin |
| `GET /api/v1/admin/inventory` | Search/category, stock classes, inclusive threshold, pagination/clamping; 401, client 403 | [inventory GET](tests/admin/inventory/index.get.spec.ts) / admin |
| `GET /api/v1/admin/inventory/{productId}` | Identity, quantity, timestamp, threshold classification; 404 | [inventory detail](tests/admin/inventory/productId.get.spec.ts) / admin |
| `POST /api/v1/admin/inventory/{productId}/adjustments` | Positive/negative deltas, persistence/ledger, idempotent replay; zero 400, 401, 403, underflow/requestId conflict 409 | [adjustment](tests/admin/inventory/productId.adjustments.post.spec.ts) / admin |
| `GET /api/v1/admin/inventory/{productId}/movements` | Own records, newest-first, pagination/clamping, empty ledger; checkout/cancel correlation in workflows | [movements](tests/admin/inventory/productId.movements.get.spec.ts), [checkout](tests/admin/orders/index.post.spec.ts), [cancel](tests/admin/orders/id.cancel.post.spec.ts) / admin |
| `GET /api/v1/traffic/info` | Public info and session selection in legacy mode; invalid session header 400 | [traffic info](tests/api/traffic/info.get.spec.ts) / api |
| `GET /api/v1/traffic/logs` | Metadata, controlled-request pagination and session isolation; negative page 400 | [traffic logs](tests/api/traffic/logs.get.spec.ts) / api |
| `GET /api/v1/traffic/logs/{correlationId}` | Own captured request body 200, unknown ID 404 | [traffic detail](tests/api/traffic/logs-correlation-id.get.spec.ts) / api |
| `POST /api/v1/ollama/generate` | SSE thinking/content/completion, blank prompt 400, 401 | [generate](tests/api/ollama/generate.post.spec.ts) / api |
| `POST /api/v1/ollama/chat` | SSE assistant role/thinking/content/completion, empty history 400, 401 | [chat](tests/api/ollama/chat.post.spec.ts) / api |
| `POST /api/v1/ollama/chat/tools` | Both product tools, complete SSE across intermediate done events, final answer, missing tools 400, 401 | [chat tools](tests/api/ollama/chat-tools.post.spec.ts) / api |
| `GET /api/v1/ollama/chat/tools/definitions` | Product tool schemas, 401 | [definitions](tests/api/ollama/tools-definitions.get.spec.ts) / api |
| `POST /api/v1/qr/create` | 400x400 PNG, blank text 400, 401, compatible PNG/JSON Accept | [QR](tests/api/qr/create.post.spec.ts) / api |

## Remaining gaps and defects in operations that have tests

| Area | Untested behavior / current status |
| --- | --- |
| Checkout | The defensive 404 when a cart product disappears has no safe API setup: foreign-key references protect the product. This branch remains unverified; consider a backend integration test with a controlled repository. |
| Commerce permissions and lookups | No separate 401/403 cases for inventory detail/movements, 401/404 for order status, 404 for cancel/adjustments/movements, or missing-product cart-item PUT. Tests of related operations do not establish these cases. |
| Other commerce boundaries | Deferred: order-list pagination errors, some terminal statuses, inventory threshold validation, requestId conflict with changed delta (changed reason is covered), additional peer mutations, overflow, concurrency and load. [Reduction scope](docs/implementation/commerce-workflow-tests.md). |
| Updating an absent user | No PUT test. Verify target behavior before asserting 403/404: authorization can precede controller lookup. [CRUD record](docs/implementation/products-users-crud-gaps.md). |
| Account deletion / email events | Profile absence and refresh-token rejection are covered; full cascade removal, admin deletion, nonexistent-target variants and nonempty event isolation remain untested. Requests using a deleted account's retained JWT produced 500 during exploration/initial teardown; independently authenticated lookup established absence in the deletion test. [Bug report](docs/deleted-account-jwt-bug-report.md). |
| Refresh/logout | Historical observation on 5 October: consumed refresh reuse returns 401, but its replacement remains usable, unlike family revocation in local backend source. Family revocation is not asserted; reconcile the contract and deployed behavior. Logout tests refresh revocation, not immediate access-JWT invalidation. |
| Prompts | Historical parsing/type defects: malformed JSON, absent body and object-valued fields return 401 instead of 400; numbers become strings. No automated regressions assert the intended behavior. Fix status is unconfirmed. [Bug report](docs/prompt-bug-report.md). |
| QR | JSON-only Accept returned misleading 401. Tests use compatible `image/png, application/json`; incompatible-Accept negotiation has no regression test. Fix status is unconfirmed. [Bug report](docs/qr-accept-bug-report.md). |
| Traffic | Historical 500 for an existing correlationId **did not reproduce on 23 October**: the active 200 test passed. Root cause remains unconfirmed. Tests cover legacy public mode, not protected mode. [Bug report](docs/traffic-detail-bug-report.md). |
| Ollama | Deterministic mock; fully buffered SSE does not establish token latency. Real upstream failures and reliable final-prose grounding against mutable price/stock are untested. The mock has a historical prose/tool-data inconsistency. [Bug report](docs/ollama-mock-bug-report.md). |
| Signup / isolation | Signup tests retain accounts. Process interruption can also bypass fixture teardown. Better cleanup improves repeatability without increasing endpoint coverage. |

## Recommended next work

The following packages divide the work into separate deliveries.
**Step 1 is implemented; start the next implementation with step 2.** Password/email
exploration for steps 2–4 is complete, with token/sink dependencies still open.
Other packages remain planned. Coverage milestones after step 1 are cumulative
projections against the 53-operation contract, assuming preceding packages are
delivered. They are not current results or test-count targets.

| Step | Delivery | New operations | Projected coverage | Dependency |
| --- | --- | --- | --- | --- |
| 1 — implemented | Account deletion and basic email-event reads | 2 delivered | 43/53 — **81.1%** current | Five focused tests passed after review |
| 2 | Password-recovery entry point and reset rejection | 2 | 45/53 — **84.9%** | Owned account and controlled recipient |
| 3 | Successful password recovery | 0; deepens step 2 | 45/53 — **84.9%** | Observable reset token on the selected environment |
| 4 | Email sending and event isolation | 1 | 46/53 — **86.8%** | Controlled mail sink and bounded polling |
| 5 | MFA enrollment | 3 | 49/53 — **92.5%** | Disposable account, TOTP generation and cleanup |
| 6 | MFA login, recovery and disable | 3 | 52/53 — **98.1%** | Step 5 enrollment and challenge support |
| 7 | SSO token exchange | 1 | 53/53 — **100%** | Test IdP, valid ID token and account cleanup |
| 8 | Existing-operation reliability and regression gaps | 0 | Unchanged | Confirmed behavior and the dependencies listed below |

### Step 1 — Account deletion and basic email-event reads

Delivered five tests across the two operation specs. Owner deletion asserts an
empty 204 response, profile absence through an independent user, and rejection
of the saved refresh token. Both rejected deletion paths preserve the target.
Email-event tests cover a fresh empty list and missing authentication. A dedicated
fixture keeps the observer alive through target teardown, verifies absence and
requires 204 when cleanup actually deletes a surviving target. No orders or mail
side effects are introduced. Full cascade coverage and nonempty event isolation
remain deferred.

Evidence: [exploration](docs/exploration/2026-10-23-account-lifecycle.md) and
[implementation/review results](docs/implementation/account-lifecycle-tests.md).

### Step 2 — Password-recovery entry point and reset rejection

Exploration completed: known/unknown forgot requests returned matching 202
messages with null tokens; invalid reset returned 400 and the original password
remained usable. These observations are ready to become regression tests;
none were added in this delivery. [Evidence](docs/exploration/2026-10-23-password-email.md).

- Scope: `POST /api/v1/users/password/forgot` and
  `POST /api/v1/users/password/reset`.
- Confirm the active profile and public response contract. Use an owned account
  and a controlled recipient; do not send mail to unrelated addresses.
- Test a generic forgot response for known/unknown identifiers without exposing
  account existence, plus a representative invalid reset token. Check that a
  rejected reset leaves the original login usable.
- Done when both operations have functional assertions and teardown succeeds.
  Label reset coverage as **negative cases only** until step 3 passes: counting
  an endpoint here does not establish successful account recovery.

### Step 3 — Successful password recovery

- Dependency: prove a supported way to obtain a raw reset token in the selected
  environment, such as a controlled inbox or enabled test-profile token echo.
  Hashed storage and email-event metadata are not token providers.
- Test the full owned-account flow: request reset, obtain token, change password,
  sign in with the new password, reject the old password and old refresh token,
  and reject token reuse. Verify unsuccessful reuse cannot change credentials.
- Make teardown use the current credentials after password changes.
- Done when the complete flow and cleanup pass. If token access is unavailable,
  record that exact dependency and continue with an independent package; do not
  mark successful recovery covered.

### Step 4 — Email sending and event isolation

Exploration completed: accepted send returned 200, invalid recipient 400 and
missing authentication 401. Immediate owned events were QUEUED. Sink delivery,
cross-user isolation and final transitions were not verified.

- Scope: `POST /api/v1/email`, extending step 1's email-event tests.
- First confirm sink access, recipient ownership, expected event states and a
  bounded observation window. Reuse this setup for step 3 if it supplies tokens.
- Test an accepted send, missing authentication and one meaningful validation
  case. Correlate only the owned request with its event and verify another user
  cannot see that event. Avoid assumptions about shared inbox/event counts.
- Done when the response and owned event are asserted reliably. Claim delivery
  only if the controlled sink confirms it; otherwise state the observation limit.

### Step 5 — MFA enrollment

- Scope: `GET /api/v1/users/2fa/status`, `POST /api/v1/users/2fa/setup` and
  `POST /api/v1/users/2fa/confirm`.
- Establish TOTP generation, timing tolerance and cleanup on a disposable account.
  Keep secrets and recovery codes out of logs, traces and attachments.
- Test initial disabled status, setup and confirmation with a valid code,
  persisted enabled status, a representative invalid confirmation and relevant
  missing-authentication checks. Keep assertions in the operation's own spec.
- Done when enrollment is reproducible and accounts are removed after both
  success and failure. Do not change the shared admin's MFA configuration.

### Step 6 — MFA login, recovery and disable

- Scope: `POST /api/v1/users/signin/2fa`,
  `POST /api/v1/users/2fa/recovery-codes` and `POST /api/v1/users/2fa/disable`.
- Reuse step 5 enrollment. Test challenge completion with a usable session and
  invalid-code rejection; replacing recovery codes invalidates the old set and
  each replacement is single-use. Test disabling MFA and verify status/login.
- Keep success and failure checks focused on these business rules rather than
  repeating malformed-token permutations already covered by authentication tests.
- Done when the lifecycle passes without affecting other users or leaving MFA
  accounts behind, including when an assertion interrupts the flow.

### Step 7 — SSO token exchange

- Scope: `POST /api/v1/users/sso/exchange`.
- Confirm test IdP access, issuer/audience expectations, a valid ID token and how
  the created/mapped application account can be safely deleted.
- Test a valid exchange with usable application tokens and a representative
  invalid-token rejection. Verify the expected mapped identity and privileges.
- Done when both paths and cleanup pass. Without an IdP/token provider, keep
  success explicitly blocked; invalid-token tests alone are limited coverage.

### Step 8 — Existing-operation reliability and regression gaps

This package can proceed independently where prerequisites are met. It improves
confidence without increasing the endpoint numerator; select distinct risks,
not every deferred permutation.

- Reproduce prompt parsing/type and QR negotiation defects; preserve the expected
  contract in regression assertions and retain unresolved failures as visible
  defects. Do not encode misleading 401 responses as the intended behavior.
- Reconcile refresh-family revocation and access-token behavior with the agreed
  contract before adding assertions. Keep the existing traffic-detail regression;
  test protected traffic mode only in an environment configured for it.
- Prioritize missing per-operation access checks for order status and inventory
  detail/history, then important missing-resource cases and absent-user PUT.
  Confirm actual 403/404 behavior before implementation. Keep repetitive commerce
  validation/status variants deferred unless a distinct risk justifies them.
- Add signup cleanup without masking duplicate-registration assertions. Verify
  owned resources are removed after assertion failures; process termination
  remains a documented cleanup limit.
- Treat checkout's defensive product-disappeared 404 as a proposed backend
  integration-test handoff, not a destructive API setup. Backend changes require
  a separately scoped task.
- Revisit Ollama grounding only after an isolated catalogue/mock setup exists;
  real upstream failures and incremental latency need suitable fault injection
  and stream observation. Keep overflow, concurrency and load testing as separate
  follow-up scopes with controlled environments.
- Done for each selected item when the report distinguishes verified coverage,
  unresolved defects and intentionally deferred behavior.

### Completion rule for each implementation delivery

Before coding, confirm the contract and environment and save a short scoped
implementation record linked from the existing index. Add only meaningful cases,
with one spec per operation, clients initialized in setup, Given/When/Then steps
and response codes in ascending order. Run new tests first, then the full suite
with zero retries, typecheck and whitespace checks. Record actual results and
cleanup, update this report's matrix/counts, and mark the package complete only
after verification. Planning this sequence does not mark any new coverage done.

## Verification status and maintenance

| Evidence / check | Result and meaning |
| --- | --- |
| Contract and active-spec review, 23 October | 53 operations, 43 with tests; linked evidence in the matrix above |
| `npx.cmd playwright test --list` during this review | 153 tests / 47 files, 80 api + 73 admin; discovery sends no API requests and is not a regression result |
| `npm.cmd run typecheck` during this review | Passed |
| Matrix, links and whitespace checks during this review | Passed: all 53 operations reconciled against contract/specs, local Markdown links checked, `git diff --check` clean |
| Parent focused run after review changes, 23 October | **5/5 passed**, 9.6s, 2 workers, 0 retries; [account lifecycle record](docs/implementation/account-lifecycle-tests.md) |
| Parent full regression after focused pass, 23 October | **153/153 passed**, 2.9 min, 4 workers, 0 retries; same account lifecycle record |
| Previous full regression, before this implementation | 148/148 passed, 3.0 min, 4 workers, 0 retries; [commerce verification record](docs/implementation/commerce-workflow-tests.md) |
| Focused commerce run recorded earlier on 23 October | 50/50 passed, 1.9 min, 4 workers, 0 retries; same implementation record |

This delivery added five account lifecycle tests and ran focused and full live
regressions. Password/email work was exploratory only and added no regression
tests. The passing suite does not establish resolution of unasserted defects,
including the deleted-account JWT 500. Historical totals of 59, 109, 148 and 169
tests describe earlier suite versions and are not the current test count.

After contract/test changes, recount method/path pairs, move operations between
tables and update area totals and discovery. Record the date and result of an
actual run separately from remaining scenario gaps. Keep delivery details in the
existing exploration/implementation records without recreating a second root plan.

```powershell
npx.cmd playwright test --list
npm.cmd test -- --project=api --project=admin --workers=4 --retries=0
npm.cmd run typecheck
git diff --check
```
