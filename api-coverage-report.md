# API coverage and test status report

Reviewed: **24 October 2026**. Implementation base revision: `248ed67`;
test-unification changes were reviewed in the working tree without subagents.
This report replaces both former root test plans and is the single maintained
source for developer-facing coverage, test status and next actions.
Detailed delivery history remains in the [exploration reports](docs/exploration/README.md)
and [implementation records](docs/implementation/README.md).

The [fixture unification](docs/implementation/fixture-unification.md) shares
client construction and account lifecycle behavior without changing endpoint
coverage. Its offline fault checks are separate from the 177 api/admin tests.
See [fixture conventions](docs/fixtures.md) for ownership and teardown rules.
The [test organization record](docs/implementation/test-unification.md) covers
the shared spec structure, client injection, naming and execution defaults.

## Coverage summary and measurement

**53 of 53 operations have direct automated behavioral checks: 100% operation coverage.**
**This is not complete feature coverage:** SSO has validation/disabled-policy tests
only; successful SSO, successful password reset and SMTP delivery remain unverified.

| Metric | Status |
| --- | --- |
| Operations in the saved OpenAPI contract | 53 across 43 paths |
| Operations with direct automated behavioral checks | 53 / 53 — **100%** |
| Operations without any direct automated behavioral check | 0 / 53 |
| Tests discovered by Playwright | **177** in 57 files: 104 `api`, 73 `admin` |
| Latest recorded full regression | **177/177 passed**, 24 October 2026, 4.3 min, 4 workers, 0 retries |

The denominator includes every HTTP operation in [docs/api-docs.json](docs/api-docs.json).
An endpoint is an **HTTP method + path** pair: GET and DELETE on the same URL
count separately; different resource IDs do not create new endpoints.
The numerator includes operations exercised with behavioral assertions in active
[tests/api](tests/api) or [tests/admin](tests/admin) specs. Duplicates across
projects count once. Clients, setup, cleanup, manual exploration and checks of
OpenAPI declarations alone do not increase this numerator.

**100% operation coverage does not mean code coverage or complete scenario, response-code or
permission coverage.** An operation with tests can still have important gaps;
these are listed below. Scenario coverage has no percentage because there is no
complete, agreed scenario inventory. Backend line and branch coverage are not
measured here.

The report combines two environments: `api` defaults to
`https://awesome.byst.re`; `admin` defaults to `https://aitesters.byst.re`.
The `admin` project also exercises ordinary staging customers, including checkout.
The aggregate 100% does not establish equivalent coverage in each environment.
Addresses come from [configuration](support/config.ts) and can be overridden by
environment variables. The scope is the saved REST contract; this is not a claim
that it inventories the current deployment, profile-specific endpoints such as
the local outbox, GraphQL or gRPC. Those interfaces are outside the denominator.

## Coverage by area

| Area | Operations with tests / total | Without tests | Functional tests |
| --- | --- | --- | --- |
| Authentication, passwords, MFA and SSO | 13 / 13 | 0 | 41 |
| Users, account deletion and email events | 7 / 7 | 0 | 23 |
| User prompts | 4 / 4 | 0 | 12 |
| Products | 5 / 5 | 0 | 19 |
| Cart | 5 / 5 | 0 | 19 |
| Orders | 6 / 6 | 0 | 23 |
| Inventory | 4 / 4 | 0 | 12 |
| Traffic | 3 / 3 | 0 | 8 |
| Ollama | 4 / 4 | 0 | 11 |
| QR | 1 / 1 | 0 | 3 |
| Email sending | 1 / 1 | 0 | 3 |
| **REST total** | **53 / 53** | **0** | **174** |

The other **3 tests** cover two technical endpoints outside the saved contract's
`paths`: [GET /v3/api-docs](tests/api/docs/documentation.get.spec.ts) (2 tests) and
[GET /swagger-ui/index.html](tests/api/docs/swagger-ui.get.spec.ts) (1 test).
They verify the document, authentication declarations and Swagger UI HTML.
They do not execute the 53 business operations and therefore do not give those
operations functional coverage.

## Operations without functional tests — complete list

None at the per-operation level: each saved-contract operation now has at least
one active HTTP test with behavioral assertions. This includes rejection paths
and the disabled-SSO policy. It does not establish each operation's successful
business flow. The matrix and remaining-gaps section retain these distinctions;
OpenAPI declaration checks and manual exploration alone still do not count.

The [24 October email/SSO evidence](docs/exploration/2026-10-24-email-sso.md)
confirms current SSO-disabled responses and owned email events. SSO success needs
an enabled API and trusted test IdP. Email acceptance and event isolation are
covered; later handoff, delivery and rendered message contents are not.

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
| `POST /api/v1/users/signup` | Registration and client login, required fields, duplicate username/email | [signup](tests/api/users/signup.post.spec.ts) / api |
| `POST /api/v1/users/signin` | Usable token and identity, invalid credentials, empty object, stale Bearer; admin role/session | [signin](tests/api/users/signin.post.spec.ts) / api; [admin](tests/admin/users/signin.post.spec.ts) / admin |
| `POST /api/v1/users/refresh` | Rotation and usable session; absent/blank token, unknown token, access JWT as refresh, reuse, stale Bearer | [refresh](tests/api/users/refresh.post.spec.ts) / api |
| `POST /api/v1/users/logout` | Empty 200, refresh revocation across sessions, fresh session after login, 401 | [logout](tests/api/users/logout.post.spec.ts) / api |
| `POST /api/v1/users/password/forgot` | Known/unknown identifiers share generic 202 and null token on the non-echo target; omitted identifier 400 | [forgot](tests/api/users/password.forgot.post.spec.ts) / api |
| `POST /api/v1/users/password/reset` | **Negative only:** unknown nonblank token 400, proposed password rejected, original password still creates a usable session | [reset](tests/api/users/password.reset.post.spec.ts) / api |
| `POST /api/v1/users/sso/exchange` | **Disabled-policy/validation only:** missing ID token 400; nonblank input returns exact SSO-disabled 404 without session fields | [SSO exchange](tests/api/users/sso.exchange.post.spec.ts) / api |
| `POST /api/v1/email` | Empty 200 and one masked owned GENERIC event, peer isolation; invalid recipient 400/no event and missing JWT 401. No delivery claim | [email](tests/api/email/index.post.spec.ts) / api |
| `GET /api/v1/users/2fa/status` | Fresh disabled status/count, 401; enabled and recovery-count persistence checked in workflow assertions | [MFA status](tests/api/users/2fa.status.get.spec.ts) / api |
| `POST /api/v1/users/2fa/setup` | Consistent manual secret/OTPAuth/PNG/expiry, pending setup remains disabled; 401 | [MFA setup](tests/api/users/2fa.setup.post.spec.ts) / api |
| `POST /api/v1/users/2fa/confirm` | Enabled status, unique recovery codes, old refresh rejected; missing authentication/invalid factor 401 preserve disabled status | [MFA confirm](tests/api/users/2fa.confirm.post.spec.ts) / api |
| `POST /api/v1/users/signin/2fa` | Password-only challenge has no session; usable TOTP/recovery sessions, challenge and TOTP replay rejection, recovery single use/count, invalid factor 401 | [MFA sign-in](tests/api/users/signin.2fa.post.spec.ts) / api |
| `POST /api/v1/users/2fa/recovery-codes` | Fresh-TOTP replacement, representative old-code rejection/new-code use; missing JWT 401, wrong password 422 preserves original codes | [MFA recovery](tests/api/users/2fa.recovery-codes.post.spec.ts) / api |
| `POST /api/v1/users/2fa/disable` | Password/recovery disable, empty 200, disabled status, refresh rejected and password-only login restored; missing JWT/invalid factor 401 | [MFA disable](tests/api/users/2fa.disable.post.spec.ts) / api |
| `GET /api/v1/users/me` | New account identity; missing JWT, malformed token and altered signature | [me](tests/api/users/me.get.spec.ts) / api |
| `GET /api/v1/users` | List contains registered profile; 401 | [users](tests/api/users/index.get.spec.ts) / api |
| `GET /api/v1/users/{username}` | Own profile, 401, absent user 404 | [username GET](tests/api/users/username.get.spec.ts) / api |
| `PUT /api/v1/users/{username}` | Owner/admin persisted updates; validation 400, missing JWT 401, peer 403 | [username PUT](tests/admin/users/username.put.spec.ts) / admin |
| `DELETE /api/v1/users/{username}` | Admin deletion: 204 and absent profile; 401, client/owner 403, absent user 404 | [username DELETE](tests/admin/users/username.delete.spec.ts) / admin |
| `DELETE /api/v1/users/{username}/right-to-be-forgotten` | Owner 204/empty body, independent observer 404, saved refresh token rejected; missing JWT 401 and peer 403 preserve target | [right-to-be-forgotten](tests/api/users/right-to-be-forgotten.delete.spec.ts) / api |
| `GET /api/v1/users/me/email-events` | Fresh empty array and missing authentication 401; populated owned metadata and peer isolation asserted by email workflow | [email events](tests/api/users/me.email-events.get.spec.ts), [email workflow](tests/api/email/index.post.spec.ts) / api |
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
| Account deletion / email events | Profile absence, refresh-token rejection and one populated GENERIC event's isolation are covered. Full cascade removal, admin deletion, nonexistent-target variants and other event types remain outside the selected cases. Requests using a deleted account's retained JWT produced 500 during earlier exploration/initial teardown. [Bug report](docs/deleted-account-jwt-bug-report.md). |
| SSO | Only missing-input 400 and explicitly disabled 404 are automated. Both configured APIs disable SSO, local Keycloak is unreachable and no trusted token setup is available. Success, provisioning/linking/conflicts and verifier 401 checks remain unverified. [Evidence](docs/exploration/2026-10-24-email-sso.md). |
| Email delivery | Acceptance and private event recording are covered, not SMTP delivery or template rendering. Tests allow recorded QUEUED/SENT_TO_SMTP_SINK/FAILED metadata without interpreting it as delivery success. Final transitions, sink contents, retries and rate-limit boundaries need controlled infrastructure. [Scope](docs/implementation/email-sso-tests.md). |
| Password recovery | Forgot response parity/identifier validation and invalid-token reset are covered. Successful reset, expiry/reuse, post-success refresh revocation, reset/MFA interaction and timing-based enumeration remain unverified. Null-token assertions are deployment-specific. [Current observations](docs/exploration/2026-10-24-password-recovery.md). |
| MFA | Core lifecycle has 16 tests. Exact expiry/skew, rate-limit saturation, races, provider-managed accounts, reset/MFA interaction and additional 400/409/410/422 combinations remain deferred. Disable success uses a recovery code; no separate TOTP-disable success. Recovery replacement samples old/new codes. [Exploration and limits](docs/exploration/2026-10-23-mfa.md). |
| Refresh/logout | Historical observation on 5 October: consumed refresh reuse returns 401, but its replacement remains usable, unlike family revocation in local backend source. Family revocation is not asserted; reconcile the contract and deployed behavior. Logout tests refresh revocation, not immediate access-JWT invalidation. |
| Prompts | Historical parsing/type defects: malformed JSON, absent body and object-valued fields return 401 instead of 400; numbers become strings. No automated regressions assert the intended behavior. Fix status is unconfirmed. [Bug report](docs/prompt-bug-report.md). |
| QR | JSON-only Accept returned misleading 401. Tests use compatible `image/png, application/json`; incompatible-Accept negotiation has no regression test. Fix status is unconfirmed. [Bug report](docs/qr-accept-bug-report.md). |
| Traffic | Historical 500 for an existing correlationId **did not reproduce on 23 October**: the active 200 test passed. Root cause remains unconfirmed. Tests cover legacy public mode, not protected mode. [Bug report](docs/traffic-detail-bug-report.md). |
| Ollama | Deterministic mock; fully buffered SSE does not establish token latency. Real upstream failures and reliable final-prose grounding against mutable price/stock are untested. The mock has a historical prose/tool-data inconsistency. [Bug report](docs/ollama-mock-bug-report.md). |
| Signup / isolation | Signup tests retain accounts. Process interruption can also bypass fixture teardown. Better cleanup improves repeatability without increasing endpoint coverage. |

## Recommended next work

All 53 operations have checks, but success-flow work remains. Steps 1, 2, 5 and 6
are implemented; step 4 covers acceptance/events, and step 7 covers validation and
the current disabled policy. Remaining work improves behavior coverage without
raising the operation numerator. Prioritize an enabled trusted SSO test setup,
an observable reset-token channel, controlled email delivery, then selected
regression gaps. [Email/SSO delivery record](docs/implementation/email-sso-tests.md).

| Step | Delivery | Counted operations | Remaining behavior | Dependency |
| --- | --- | --- | --- | --- |
| 1 — implemented | Account deletion and basic email-event reads | 2 | Full deletion cascade and additional event types | Existing lifecycle support |
| 2 — implemented | Password-recovery entry point and reset rejection | 2 | Successful reset is step 3 | Three current tests |
| 3 — open | Successful password recovery | Already counted | Valid reset, password/session effects and token lifecycle | Observable reset token |
| 4 — core implemented | Email acceptance and event isolation | 1 | SMTP delivery, final transitions and contents | Controlled mail sink |
| 5 — implemented | MFA enrollment | 3 | Specialized boundaries remain deferred | Seven enrollment tests |
| 6 — implemented | MFA login, recovery and disable | 3 | Specialized boundaries remain deferred | Nine authentication/recovery tests |
| 7 — partial | SSO exchange validation/disabled policy | 1 | Enabled exchange, identity mapping and token verification | Enabled API and trusted test IdP |
| 8 — open | Existing-operation reliability and regression gaps | Already counted | Selected defects, permissions and cleanup gaps | Confirmed behavior and controlled dependencies |

### Step 1 — Account deletion and basic email-event reads

Delivered five tests across the two operation specs. Owner deletion asserts an
empty 204 response, profile absence through an independent user, and rejection
of the saved refresh token. Both rejected deletion paths preserve the target.
Email-event tests cover a fresh empty list and missing authentication. A dedicated
fixture keeps the observer alive through target teardown, verifies absence and
requires 204 when cleanup actually deletes a surviving target. No orders or mail
side effects were introduced in that delivery. Full cascade coverage remains
deferred; later step 4 now checks isolation of a populated GENERIC event.

Evidence: [exploration](docs/exploration/2026-10-23-account-lifecycle.md) and
[implementation/review results](docs/implementation/account-lifecycle-tests.md).

### Step 2 — Password-recovery entry point and reset rejection

Delivered three tests on 24 October: generic matching 202/no-token responses for
known/unknown usernames, missing-identifier 400, and unknown-reset-token 400.
The reset case also rejects the proposed password and proves the original
password still yields a usable session for the owned profile. Both accounts use
the existing owner-delete fixture. **Reset remains negative cases only.**
See [observations](docs/exploration/2026-10-24-password-recovery.md) and
[implementation](docs/implementation/password-recovery-entry-tests.md). Successful
reset, reset-token lifecycle and delivery are not established by these tests.

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

Delivered three tests: accepted empty 200 with a masked owned GENERIC event and
empty peer events, invalid-recipient 400 without event creation, and missing JWT
401. Event creation is polled for at most five seconds; no fixed delivery wait
or global outbox access is used. SMTP handoff/delivery and message contents remain
unverified. [Evidence](docs/exploration/2026-10-24-email-sso.md).

### Step 5 — MFA enrollment

Delivered seven tests across status, setup and confirm. They verify disabled,
pending and enabled states, consistent provisioning, unique recovery codes,
refresh rejection and missing-authentication/invalid-confirmation cases. The
TOTP helper uses bounded fresh-step waits; the MFA fixture owns account cleanup.
No shared account or admin MFA was changed. See the
[implementation record](docs/implementation/mfa-lifecycle-tests.md).

### Step 6 — MFA login, recovery and disable

Delivered nine tests across signin/2fa, recovery-code replacement and disable.
They verify usable TOTP/recovery sessions, no session after password alone,
challenge/factor replay rejection, recovery single use/count, replacement,
reauthentication failures, disable persistence and refresh rejection. A temporary
fault probe confirmed cleanup can recover through MFA login after an intentional
test failure and an unusable stored access token; it was removed afterward.

### Step 7 — SSO token exchange

Delivered two exact policy cases: missing ID token 400 and nonblank input 404
`SSO login is disabled`. Both configured API hosts return that disabled response;
the local IdP is unreachable. No app JWT is sent and no SSO accounts are created.
Do not interpret this as invalid-signature 401 or successful exchange coverage.

Next: supply an enabled API and trusted IdP for disposable identities, establish
safe account cleanup, then verify usable tokens, mapped identity/privileges,
provisioning/linking and meaningful rejection/conflict cases. Backend mocks and
an arbitrary self-signed token cannot establish the deployed trust chain.

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
with one method-bearing spec per operation, injected clients, Given/When/Then
comments and flat status-prefixed names in ascending response-code order. Follow
[test conventions](docs/test-conventions.md). Run new tests first, then the full suite
with zero retries, typecheck and whitespace checks. Record actual results and
cleanup, update this report's matrix/counts, and mark the package complete only
after verification. Planning this sequence does not mark any new coverage done.

## Verification status and maintenance

| Evidence / check | Result and meaning |
| --- | --- |
| Contract and active-spec review, 24 October | 53 operations, 53 with direct behavioral tests; linked evidence in the matrix above |
| `npx.cmd playwright test --list` during this review | 177 tests / 57 files, 104 api + 73 admin; discovery sends no API requests and is not a regression result |
| `npm.cmd run typecheck` during this review | Passed |
| Matrix, links and whitespace checks during this review | Passed: all 53 operations reconciled against contract/specs, local Markdown links checked, `git diff --check` clean |
| Test organization unification, 24 October | Targeted **51/51 passed**, 1.1 min; full **177/177 passed**, 4.3 min; both 4 workers, 0 retries. Final profile check **4/4 passed**, 3.1s, 2 workers, 0 retries. Offline fixture checks **12/12 passed**; final typecheck with noUnusedLocals, links and whitespace passed; [record](docs/implementation/test-unification.md) |
| Commerce/MFA helper extraction, 24 October | Targeted **66/66 passed**, 2.7 min; full **177/177 passed**, 4.0 min; both 4 workers, 0 retries. Existing 12 offline fixture checks, typecheck and whitespace also passed; [record](docs/implementation/fixture-unification.md#readability-follow-up) |
| Fixture lifecycle fault checks, 24 October | **12/12 passed**, offline; partial signup, token renewal, deletion verification and cleanup failures |
| Fixture targeted live regression, 24 October | **73/73 passed**, 2.7 min, 4 workers, 0 retries |
| Full regression after fixture unification, 24 October | **177/177 passed**, 4.1 min, 4 workers, 0 retries; [record](docs/implementation/fixture-unification.md) |
| Email/SSO focused run, 24 October | **5/5 passed**, 4.7s, 2 workers, 0 retries; [record](docs/implementation/email-sso-tests.md) |
| Full regression after email/SSO verification, 24 October | **177/177 passed**, 4.2 min, 4 workers, 0 retries; 104 api / 73 admin |
| Password recovery focused run, 24 October | **3/3 passed**, 5.0s, 2 workers, 0 retries; [record](docs/implementation/password-recovery-entry-tests.md) |
| Full regression after password-recovery verification, 24 October | **172/172 passed**, 4.5 min, 4 workers, 0 retries; 99 api / 73 admin |
| MFA focused run, 23 October | **16/16 passed**, 1.6 min, 2 workers, 0 retries; [MFA record](docs/implementation/mfa-lifecycle-tests.md) |
| MFA review and temporary cleanup fault checks | Three sign-in tests plus two temporary cases: four passed, one intentional expected failure, zero unexpected results; 39.7s. Temporary cases removed. |
| Full regression after MFA verification, 23 October | **169/169 passed**, 4.0 min, 4 workers, 0 retries; 96 api / 73 admin |
| Previous account lifecycle verification, 23 October | Focused **5/5 passed**, 9.6s; full **153/153 passed**, 2.9 min, 4 workers, 0 retries; [record](docs/implementation/account-lifecycle-tests.md) |
| Previous full regression, before this implementation | 148/148 passed, 3.0 min, 4 workers, 0 retries; [commerce verification record](docs/implementation/commerce-workflow-tests.md) |
| Focused commerce run recorded earlier on 23 October | 50/50 passed, 1.9 min, 4 workers, 0 retries; same implementation record |

The latest 24 October work unified endpoint spec structure, injected clients,
status-prefixed names, method-bearing filenames and execution defaults; targeted
and full live regressions passed. Earlier fixture work extracted local commerce
cleanup and MFA session-renewal helpers. Fixture
unification added 12 separate offline cleanup fault checks. The preceding
endpoint delivery added five email/SSO policy tests without subagents.
Email acceptance/events are verified;
SMTP delivery, successful SSO and successful password reset remain unverified.
Earlier deliveries added three password-recovery tests, 16 MFA tests and five
account lifecycle tests. The passing suite does not establish resolution of
unasserted defects, including the deleted-account JWT 500. Historical runs refer
to their dated suite versions; use the current 177-test discovery and project split.

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
