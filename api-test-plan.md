# API Test Plan

This plan is based on `docs/api-docs.json` and a quick backend code review in
`../test-secure-backend`. Its main purpose is to keep the API suite easy to
grow, easy to review, and ordered so the simplest endpoints come first.

## Current Baseline

Already covered in `tests/api`:

| Endpoint | Auth | Status | Notes |
| --- | --- | --- | --- |
| `POST /api/v1/users/signup` | Public | Done | Public registration flow. |
| `POST /api/v1/users/signin` | Public | Done | Produces access and refresh tokens. |
| `GET /api/v1/users/me` | Bearer | Done | Confirms authenticated fixture/client setup. |
| `POST /api/v1/users/refresh`, `POST /api/v1/users/logout` | Public / Bearer | Done | Token rotation and revocation. |
| `GET /api/v1/traffic/info`, `GET /api/v1/traffic/logs` | Public (legacy mode) | Done (core) | 6 tests: info, session topics, pagination/isolation and validation. |
| `GET /api/v1/products`, `GET /api/v1/products/{id}` | Bearer | Done (core) | 6 tests: reads, validation, authentication and not-found. |
| Chat/tool prompt GET and PUT | Bearer | Done (core) | 12 tests: defaults, updates/isolation, null reset, length validation and authentication. |
| `GET /api/v1/users`, `GET /api/v1/users/{username}` | Bearer | Done (core) | 5 tests: registered profile reads, missing authentication and absent username. |
| `GET /api/v1/cart`, `DELETE /api/v1/cart` | Bearer | Done (core) | 4 tests: empty cart, populated clear and missing authentication. |
| OpenAPI smoke checks | Public | Done | `api-docs` and Swagger UI checks exist. |

Focused revision on 6 October 2026: **9/9 user/cart tests passed**; full-suite
verification passed **59/59** with two workers and zero retries.
Typechecking and `git diff --check` passed. The earlier traffic/products/prompts
batch added 24 tests and passed the then-current 50-test suite.

## Working Rules

- Keep one test file per endpoint operation.
- Same URL with different HTTP methods means separate files.
- Initialize HTTP clients in test setup, following `tests/api/users/me.spec.ts`.
- Use `given` for setup, `when` for the tested action, and `then` for assertions.
- In each spec, order tests by expected response code ascending: `200`, `201`, `202`, `204`, then `400`, `401`, `403`, `404`, `409`, `422`, `429`.
- When an endpoint behavior is unclear, check `docs/api-docs.json`, backend code, or the live app before adding the test.
- Run newly created tests first. After they pass, run the whole suite to catch regressions.

Suggested file naming:

| Endpoint | File |
| --- | --- |
| `POST /api/v1/users/refresh` | `tests/api/users/refresh.spec.ts` |
| `PUT /api/v1/users/{username}` | `tests/api/users/username.put.spec.ts` |
| `DELETE /api/v1/users/{username}` | `tests/api/users/username.delete.spec.ts` |
| `GET /api/v1/products/{id}` | `tests/api/products/id.get.spec.ts` |
| `POST /api/v1/cart/items` | `tests/api/cart/items.post.spec.ts` |

## Difficulty Scale

| Difficulty | Meaning |
| --- | --- |
| 1 | Simple public or read-only endpoint; little setup; stable assertions. |
| 2 | Auth required or light setup; still mostly direct request/response checks. |
| 3 | Requires seeded data, ownership checks, role checks, or state cleanup. |
| 4 | Multi-step business flow or destructive operation. |
| 5 | Streaming, async, rate-limited, environment-sensitive, or external-service dependent. |

## Recommended Delivery Order

Start with these, in order. This keeps early work small and builds reusable clients before bigger flows.

| Order | Endpoint | Difficulty | Why Here |
| --- | --- | ---: | --- |
| 1 | `POST /api/v1/users/refresh` | 2 | Done. Reuses existing signin flow and validates token plumbing. |
| 2 | `POST /api/v1/users/logout` | 2 | Done. Reuses auth fixture; pairs naturally with refresh token tests. |
| 3 | `GET /api/v1/traffic/info` | 1 | Done (core). Public in legacy mode; session topic and validation. |
| 4 | `GET /api/v1/traffic/logs` | 1 | Done (core). Public page structure and controlled session pagination. |
| 5 | `GET /api/v1/products` | 2 | Done (core). Authenticated read-only endpoint. |
| 6 | `GET /api/v1/products/{id}` | 2 | Done (core). Read, `400`, `401` and `404`. |
| 7 | `GET /api/v1/users/chat-system-prompt` | 2 | Done (core). Current-user default and authentication. |
| 8 | `PUT /api/v1/users/chat-system-prompt` | 2 | Done (core). Persistence/isolation, reset, length and authentication. |
| 9 | `GET /api/v1/users/tool-system-prompt` | 2 | Done (core). Same pattern as chat read. |
| 10 | `PUT /api/v1/users/tool-system-prompt` | 2 | Done (core). Same pattern as chat update; parsing/type defects remain open. |
| 11 | `GET /api/v1/users` | 2 | Done (core). 2 tests: client list and missing authentication. |
| 12 | `GET /api/v1/users/{username}` | 2 | Done (core). 3 tests: registered profile, missing authentication and `404`. |
| 13 | `GET /api/v1/cart` | 2 | Done (core). 2 tests: empty cart with zero totals and missing authentication. |
| 14 | `DELETE /api/v1/cart` | 2 | Done (core). 2 tests: populated clear and missing authentication. |
| 15 | `GET /api/v1/users/me/email-events` | 3 | Needs email/password-reset action if asserting non-empty results. |
| 16 | `POST /api/v1/users/password/forgot` | 3 | Public, but async email side effect and `202` behavior need care. |
| 17 | `POST /api/v1/users/password/reset` | 4 | Requires acquiring a valid reset token or local outbox support. |
| 18 | `POST /api/v1/products` | 3 | Admin-only mutation; needs admin client and cleanup. |
| 19 | `PUT /api/v1/products/{id}` | 3 | Admin-only mutation; needs existing product. |
| 20 | `DELETE /api/v1/products/{id}` | 3 | Admin-only destructive operation; isolate test data. |
| 21 | `POST /api/v1/cart/items` | 3 | Needs product data and quantity validation. |
| 22 | `PUT /api/v1/cart/items/{productId}` | 3 | Needs existing cart item. |
| 23 | `DELETE /api/v1/cart/items/{productId}` | 3 | Needs existing cart item and `404` coverage. |
| 24 | `PUT /api/v1/users/{username}` | 3 | Owner/admin authorization logic plus validation. |
| 25 | `DELETE /api/v1/users/{username}` | 4 | Admin-only destructive operation. |
| 26 | `DELETE /api/v1/users/{username}/right-to-be-forgotten` | 4 | Destructive owner/admin flow; may remove cart/orders/email events. |
| 27 | `POST /api/v1/orders` | 4 | Requires cart setup and address payload. |
| 28 | `GET /api/v1/orders` | 3 | Needs created or seeded orders; pagination/status filters. |
| 29 | `GET /api/v1/orders/{id}` | 3 | Ownership/admin behavior plus `404`. |
| 30 | `POST /api/v1/orders/{id}/cancel` | 4 | Status-dependent business rules. |
| 31 | `GET /api/v1/orders/admin` | 3 | Admin-only list and client `403`. |
| 32 | `PUT /api/v1/orders/{id}/status` | 4 | Admin-only status transitions and invalid transition checks. |
| 33 | `POST /api/v1/email` | 4 | Authenticated async side effect and rate limiting. |
| 34 | `POST /api/v1/qr/create` | 3 | Binary PNG response; rate limiting can be separate. |
| 35 | `GET /api/v1/traffic/logs/{correlationId}` | 3 | Needs known correlation id or controlled log creation. |
| 36 | `GET /api/v1/ollama/chat/tools/definitions` | 2 | Authenticated read-only schema endpoint. |
| 37 | `POST /api/v1/ollama/generate` | 5 | Streaming and Ollama availability. |
| 38 | `POST /api/v1/ollama/chat` | 5 | Streaming and model availability. |
| 39 | `POST /api/v1/ollama/chat/tools` | 5 | Streaming plus function-calling behavior. |

## Backend-Informed Notes

Security comes from `WebSecurityConfig`. Public endpoints include signin, signup, refresh, password reset and docs. Traffic endpoints are public only when legacy public access is enabled, as observed on the configured deployment. Check local email outbox authorization against the running profile. Other endpoints in the matrix require bearer authentication.

Role checks are mostly method-level:

| Endpoint Group | Backend Behavior |
| --- | --- |
| Product mutations | `POST`, `PUT`, and `DELETE /api/v1/products...` require `ROLE_ADMIN`. |
| User delete | `DELETE /api/v1/users/{username}` requires `ROLE_ADMIN`. |
| User edit | `PUT /api/v1/users/{username}` allows admin or the same username. |
| Right to be forgotten | Allows admin or the same username. |
| Order admin list/status | `GET /api/v1/orders/admin` and `PUT /api/v1/orders/{id}/status` require `ROLE_ADMIN`. |
| Traffic endpoints | Public only with legacy public access; otherwise authentication/session requirements apply. Keep tests structural and avoid brittle assumptions about logged traffic volume. |
| Ollama endpoints | Bearer auth plus streaming/external model dependency. Keep late in the plan. |

Important implementation detail: some user endpoints combine existence checks inside `@PreAuthorize`, for example `PUT /api/v1/users/{username}` and `DELETE /api/v1/users/{username}/right-to-be-forgotten`. If a user does not exist, Spring Security may return `403` before controller logic can produce the documented `404`. Verify against the live app before locking expected status codes.

Auth coverage uses a unique registered account per test and fixture-owned cleanup.
Refresh covers usable access tokens, replacement-token rotation, missing/blank
input (`400`), unknown/access/consumed tokens (`401`), and stale Bearer headers
(`401`). Logout covers an empty `200` response, revocation across multiple
sessions, a usable new session after sign-in, and missing/malformed authorization
(`401`). Both specs use `test.step` and disable traces and retries.

Live observation on 5 October 2026 at `https://awesome.byst.re`: replaying a
consumed refresh token returns `401`, but its replacement still refreshes with
`200`. The local backend source additionally revokes the token family on replay.
That source/deployment difference needs follow-up; family revocation is not an
assertion in the current suite because the published contract specifies rotation
and invalid-token rejection without promising family revocation. Access JWTs
remain usable after logout, so fixture cleanup can use the original JWT.

## Endpoint Matrix

### Exploration and automation of eight operations

Exploratory checks completed on 6 October 2026 against `https://awesome.byst.re`.
All eight happy paths worked. Both prompt PUT endpoints returned unexpected
`401` for malformed JSON, object-valued fields and missing bodies with valid JWTs,
and accepted numeric fields as strings with `200`. These remain open defects.

Prompt resets, persistence and isolation worked; PUT echoes the stored reset
value while GET returns the default. Traffic topics/log selection depend on
session headers, and page sizes clamp to the configured maximum.

Findings: [exploration](docs/exploration/2026-10-06-traffic-products-prompts.md) and
[bug report](docs/prompt-bug-report.md). Coverage details:
[traffic](tests/api/traffic/api-test-plan.md),
[products](tests/api/products/api-test-plan.md), and
[users](tests/api/users/api-test-plan.md). Eight specs implement the agreed
24-test core scope; all targeted batches passed, then the full suite passed 50/50.


| Area | Endpoint | Auth | Role | Difficulty | Status | First Useful Coverage |
| --- | --- | --- | --- | ---: | --- | --- |
| Auth | `POST /api/v1/users/signup` | Public | n/a | 2 | Done | `201`, `400` validation, duplicate username/email. |
| Auth | `POST /api/v1/users/signin` | Public | n/a | 2 | Done | `200`, invalid credentials, validation. |
| Auth | `POST /api/v1/users/refresh` | Public | n/a | 2 | Done | `200`, `400`, invalid/reused refresh token. |
| Auth | `POST /api/v1/users/logout` | Bearer | Any | 2 | Done | `200`, `401`, refresh token no longer usable. |
| Users | `GET /api/v1/users/me` | Bearer | Any | 2 | Done | `200`, `401`. |
| Users | `GET /api/v1/users` | Bearer | Any | 2 | Done (core) | 2 tests: `200` array with registered profile; `401` missing auth. |
| Users | `GET /api/v1/users/{username}` | Bearer | Any | 2 | Done (core) | 3 tests: `200` registered profile, `401` missing auth, `404` absent username. |
| Users | `PUT /api/v1/users/{username}` | Bearer | Owner/Admin | 3 | Not started | `200`, `400`, `401`, `403`, verified missing-user behavior. |
| Users | `DELETE /api/v1/users/{username}` | Bearer | Admin | 4 | Not started | `204`, `401`, `403`, `404`. |
| Users | `DELETE /api/v1/users/{username}/right-to-be-forgotten` | Bearer | Owner/Admin | 4 | Not started | `204`, `401`, `403`, verified missing-user behavior. |
| Prompts | `GET /api/v1/users/chat-system-prompt` | Bearer | Any | 2 | Done (core) | 2 tests: `200` default, `401` missing auth. |
| Prompts | `PUT /api/v1/users/chat-system-prompt` | Bearer | Any | 2 | Done (core); defects open | 4 tests: `200` persistence/isolation and null reset, `400` length, `401` auth. |
| Prompts | `GET /api/v1/users/tool-system-prompt` | Bearer | Any | 2 | Done (core) | 2 tests: `200` default, `401` missing auth. |
| Prompts | `PUT /api/v1/users/tool-system-prompt` | Bearer | Any | 2 | Done (core); defects open | 4 tests: `200` persistence/isolation and null reset, `400` length, `401` auth. |
| Password | `POST /api/v1/users/password/forgot` | Public | n/a | 3 | Not started | `202`, validation, no user enumeration. |
| Password | `POST /api/v1/users/password/reset` | Public | n/a | 4 | Not started | `200`, invalid token, password mismatch/validation. |
| Products | `GET /api/v1/products` | Bearer | Any | 2 | Done (core) | 2 tests: `200` array shape, `401`. |
| Products | `GET /api/v1/products/{id}` | Bearer | Any | 2 | Done (core) | 4 tests: `200`, `400` nonnumeric ID, `401`, `404`. |
| Products | `POST /api/v1/products` | Bearer | Admin | 3 | Not started | `201`, `400`, `401`, `403`. |
| Products | `PUT /api/v1/products/{id}` | Bearer | Admin | 3 | Not started | `200`, `400`, `401`, `403`, `404`. |
| Products | `DELETE /api/v1/products/{id}` | Bearer | Admin | 3 | Not started | `204`, `401`, `403`, `404`. |
| Cart | `GET /api/v1/cart` | Bearer | Any | 2 | Done (core) | 2 tests: `200` empty cart/zero totals; `401` missing auth. |
| Cart | `DELETE /api/v1/cart` | Bearer | Any | 2 | Done (core) | 2 tests: `204` populated clear verified by GET; `401` missing auth. |
| Cart | `POST /api/v1/cart/items` | Bearer | Any | 3 | Not started | `200`, `400`, `401`, `404`. |
| Cart | `PUT /api/v1/cart/items/{productId}` | Bearer | Any | 3 | Not started | `200`, `400`, `401`, `404`. |
| Cart | `DELETE /api/v1/cart/items/{productId}` | Bearer | Any | 3 | Not started | `200`, `401`, `404`. |
| Orders | `POST /api/v1/orders` | Bearer | Any | 4 | Not started | `201`, `400`, `401`. |
| Orders | `GET /api/v1/orders` | Bearer | Any | 3 | Not started | `200`, `401`, pagination/status filter shape. |
| Orders | `GET /api/v1/orders/{id}` | Bearer | Owner/Admin | 3 | Not started | `200`, `401`, `404`, ownership behavior. |
| Orders | `POST /api/v1/orders/{id}/cancel` | Bearer | Owner/Admin | 4 | Not started | `200`, `400`, `401`, `404`. |
| Orders | `GET /api/v1/orders/admin` | Bearer | Admin | 3 | Not started | `200`, `401`, `403`. |
| Orders | `PUT /api/v1/orders/{id}/status` | Bearer | Admin | 4 | Not started | `200`, `400`, `401`, `403`, `404`. |
| Email | `POST /api/v1/email` | Bearer | Any | 4 | Not started | `200`, `400`, `401`; side effect only if stable. |
| Email | `GET /api/v1/users/me/email-events` | Bearer | Any | 3 | Not started | `200`, `401`, events isolated to current user. |
| QR | `POST /api/v1/qr/create` | Bearer | Any | 3 | Not started | `200` with `image/png`, `400`, `401`. |
| Traffic | `GET /api/v1/traffic/info` | Public (legacy mode) | n/a | 1 | Done (core) | 3 tests: `200` default/session topic, `400` invalid session. |
| Traffic | `GET /api/v1/traffic/logs` | Public (legacy mode) | n/a | 1 | Done (core) | 3 tests: `200` public structure and session pagination/isolation, `400` negative page. |
| Traffic | `GET /api/v1/traffic/logs/{correlationId}` | Public | n/a | 3 | Not started | `200` with known id or `404` with unknown id. |
| Ollama | `GET /api/v1/ollama/chat/tools/definitions` | Bearer | Any | 2 | Not started | `200`, `401`, schema shape. |
| Ollama | `POST /api/v1/ollama/generate` | Bearer | Any | 5 | Not started | `200` stream, `400`, `401`, `404` model. |
| Ollama | `POST /api/v1/ollama/chat` | Bearer | Any | 5 | Not started | `200` stream, `400`, `401`, `404` model. |
| Ollama | `POST /api/v1/ollama/chat/tools` | Bearer | Any | 5 | Not started | `200` stream, `400`, `401`, tool behavior. |

## Suggested Client/Fixture Growth

Add clients only when the next endpoint needs them:

| Step | Add |
| --- | --- |
| Auth continuation | Refresh/logout methods in `auth.client.ts`. |
| Read-only endpoints | `products.client.ts`, `traffic.client.ts`, prompt methods in `users.client.ts`. |
| Role checks | Admin auth fixture/client setup. |
| Stateful commerce | `cart.client.ts`, `orders.client.ts`, product data builder. |
| Side effects | Email helpers, local outbox helper if the running profile exposes it. |
| Advanced | Streaming helper for SSE/Ollama assertions. |

## Definition of Done

An endpoint is done when:

- A dedicated spec file exists for that operation.
- HTTP clients are initialized in setup.
- Tests follow `given` / `when` / `then`.
- Response-code order is ascending inside the file.
- Happy path and the main negative path are covered.
- `401` is covered for protected endpoints.
- `403` is covered for role/ownership restrictions.
- Status code and key response body/content are asserted.
- Newly added tests pass on their own.
- The full suite passes after the new tests pass.

## Completed Batches and Remaining Scope

Operations 11-14 now contain **9 focused tests** (user list 2, username lookup 3,
cart GET 2, cart DELETE 2), reduced from 16. Targeted verification passed **9/9**
on 6 October 2026; the full suite passed **59/59** with two workers and zero retries.
Typechecking and `git diff --check` passed.
Clients initialize in setup; specs use test.step, ascending status groups,
disabled traces and zero retries. Fixtures own account and cart cleanup.
Only populated clearing needs a catalogue product with at least one unit in stock.

Deferred: peer reads/cart isolation, populated cart GET totals, repeated empty
clearing and extra JWT variants. Shared authentication variants remain covered
by existing auth/me tests. Dedicated cart item operations remain unstarted.
Traffic secondary boundaries and prompt parsing/type defects remain deferred
in their folder plans.

See [exploration](docs/exploration/2026-10-06-users-cart.md),
[users plan](tests/api/users/api-test-plan.md), and
[cart plan](tests/api/cart/api-test-plan.md).
The next unstarted operation in delivery order is `GET /api/v1/users/me/email-events`.
