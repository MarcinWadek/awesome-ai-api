# API coverage

Coverage baseline: **24 October 2026**. Documentation condensed on 25 October;
live APIs were not revalidated by this edit.

| Measure | Recorded result |
| --- | --- |
| Saved REST contract | 53 operations across 43 paths |
| Operations with direct behavioral tests | **53/53 (100%)** |
| Endpoint tests | **177 in 57 files**: 104 api, 73 admin |
| Latest full live regression, 24 October | **177/177 passed**, 4.3 min, 4 workers, 0 retries |
| Offline fixture checks, 25 October | **12/12 passed**, separate from endpoint coverage |

An operation is a method/path pair in [the saved contract](docs/api-docs.json).
The matrix counts active behavioral checks, including negative/disabled-policy
cases; setup calls and documentation assertions alone do not count.
**100% operation coverage is not complete feature, scenario or code coverage.**
Results combine API/staging environments and do not establish equivalent checks
on each. Three of the 177 tests check OpenAPI/Swagger availability outside the
saved business-operation inventory.

## Endpoint-to-test matrix

Open the linked specs for assertions and selected response codes.

| Operation | Specs / project |
| --- | --- |
| `POST /api/v1/users/signup` | [signup](tests/api/users/signup.post.spec.ts) / api |
| `POST /api/v1/users/signin` | [signin](tests/api/users/signin.post.spec.ts) / api; [admin](tests/admin/users/signin.post.spec.ts) / admin |
| `POST /api/v1/users/refresh` | [refresh](tests/api/users/refresh.post.spec.ts) / api |
| `POST /api/v1/users/logout` | [logout](tests/api/users/logout.post.spec.ts) / api |
| `POST /api/v1/users/password/forgot` | [forgot](tests/api/users/password.forgot.post.spec.ts) / api |
| `POST /api/v1/users/password/reset` | **Negative only.** [reset](tests/api/users/password.reset.post.spec.ts) / api |
| `POST /api/v1/users/sso/exchange` | **Disabled policy/validation.** [SSO exchange](tests/api/users/sso.exchange.post.spec.ts) / api |
| `POST /api/v1/email` | [email](tests/api/email/index.post.spec.ts) / api |
| `GET /api/v1/users/2fa/status` | [MFA status](tests/api/users/2fa.status.get.spec.ts) / api |
| `POST /api/v1/users/2fa/setup` | [MFA setup](tests/api/users/2fa.setup.post.spec.ts) / api |
| `POST /api/v1/users/2fa/confirm` | [MFA confirm](tests/api/users/2fa.confirm.post.spec.ts) / api |
| `POST /api/v1/users/signin/2fa` | [MFA sign-in](tests/api/users/signin.2fa.post.spec.ts) / api |
| `POST /api/v1/users/2fa/recovery-codes` | [MFA recovery](tests/api/users/2fa.recovery-codes.post.spec.ts) / api |
| `POST /api/v1/users/2fa/disable` | [MFA disable](tests/api/users/2fa.disable.post.spec.ts) / api |
| `GET /api/v1/users/me` | [me](tests/api/users/me.get.spec.ts) / api |
| `GET /api/v1/users` | [users](tests/api/users/index.get.spec.ts) / api |
| `GET /api/v1/users/{username}` | [username GET](tests/api/users/username.get.spec.ts) / api |
| `PUT /api/v1/users/{username}` | [username PUT](tests/admin/users/username.put.spec.ts) / admin |
| `DELETE /api/v1/users/{username}` | [username DELETE](tests/admin/users/username.delete.spec.ts) / admin |
| `DELETE /api/v1/users/{username}/right-to-be-forgotten` | [right-to-be-forgotten](tests/api/users/right-to-be-forgotten.delete.spec.ts) / api |
| `GET /api/v1/users/me/email-events` | [email events](tests/api/users/me.email-events.get.spec.ts), [email workflow](tests/api/email/index.post.spec.ts) / api |
| `GET /api/v1/users/chat-system-prompt` | [chat GET](tests/api/users/chat-system-prompt.get.spec.ts) / api |
| `PUT /api/v1/users/chat-system-prompt` | [chat PUT](tests/api/users/chat-system-prompt.put.spec.ts) / api |
| `GET /api/v1/users/tool-system-prompt` | [tool GET](tests/api/users/tool-system-prompt.get.spec.ts) / api |
| `PUT /api/v1/users/tool-system-prompt` | [tool PUT](tests/api/users/tool-system-prompt.put.spec.ts) / api |
| `GET /api/v1/products` | [products GET](tests/api/products/index.get.spec.ts) / api |
| `GET /api/v1/products/{id}` | [product GET](tests/api/products/id.get.spec.ts) / api |
| `POST /api/v1/products` | [product POST](tests/admin/products/index.post.spec.ts) / admin |
| `PUT /api/v1/products/{id}` | [product PUT](tests/admin/products/id.put.spec.ts) / admin |
| `DELETE /api/v1/products/{id}` | [product DELETE](tests/admin/products/id.delete.spec.ts) / admin |
| `GET /api/v1/cart` | [cart GET](tests/api/cart/index.get.spec.ts) / api; [checkout](tests/admin/orders/index.post.spec.ts) / admin |
| `DELETE /api/v1/cart` | [clear](tests/api/cart/index.delete.spec.ts) / api; [staging clear](tests/admin/cart/index.delete.spec.ts) / admin |
| `POST /api/v1/cart/items` | [item POST](tests/admin/cart/items.post.spec.ts) / admin |
| `PUT /api/v1/cart/items/{productId}` | [item PUT](tests/admin/cart/items.productId.put.spec.ts) / admin |
| `DELETE /api/v1/cart/items/{productId}` | [item DELETE](tests/admin/cart/items.productId.delete.spec.ts) / admin |
| `POST /api/v1/orders` | [checkout](tests/admin/orders/index.post.spec.ts) / admin |
| `GET /api/v1/orders` | [orders GET](tests/admin/orders/index.get.spec.ts) / admin |
| `GET /api/v1/orders/{id}` | [order GET](tests/admin/orders/id.get.spec.ts), [checkout](tests/admin/orders/index.post.spec.ts) / admin |
| `POST /api/v1/orders/{id}/cancel` | [cancel](tests/admin/orders/id.cancel.post.spec.ts) / admin |
| `GET /api/v1/orders/admin` | [admin orders](tests/admin/orders/admin.get.spec.ts) / admin |
| `PUT /api/v1/orders/{id}/status` | [status PUT](tests/admin/orders/id.status.put.spec.ts) / admin |
| `GET /api/v1/admin/inventory` | [inventory GET](tests/admin/inventory/index.get.spec.ts) / admin |
| `GET /api/v1/admin/inventory/{productId}` | [inventory detail](tests/admin/inventory/productId.get.spec.ts) / admin |
| `POST /api/v1/admin/inventory/{productId}/adjustments` | [adjustment](tests/admin/inventory/productId.adjustments.post.spec.ts) / admin |
| `GET /api/v1/admin/inventory/{productId}/movements` | [movements](tests/admin/inventory/productId.movements.get.spec.ts), [checkout](tests/admin/orders/index.post.spec.ts), [cancel](tests/admin/orders/id.cancel.post.spec.ts) / admin |
| `GET /api/v1/traffic/info` | [traffic info](tests/api/traffic/info.get.spec.ts) / api |
| `GET /api/v1/traffic/logs` | [traffic logs](tests/api/traffic/logs.get.spec.ts) / api |
| `GET /api/v1/traffic/logs/{correlationId}` | [traffic detail](tests/api/traffic/logs-correlation-id.get.spec.ts) / api |
| `POST /api/v1/ollama/generate` | [generate](tests/api/ollama/generate.post.spec.ts) / api |
| `POST /api/v1/ollama/chat` | [chat](tests/api/ollama/chat.post.spec.ts) / api |
| `POST /api/v1/ollama/chat/tools` | [chat tools](tests/api/ollama/chat-tools.post.spec.ts) / api |
| `GET /api/v1/ollama/chat/tools/definitions` | [definitions](tests/api/ollama/tools-definitions.get.spec.ts) / api |
| `POST /api/v1/qr/create` | [QR](tests/api/qr/create.post.spec.ts) / api |

## Remaining gaps

| Area | Important unverified behavior / dependency |
| --- | --- |
| Password reset | Successful reset, expiry/reuse and session effects need an observable reset token |
| SSO | Enabled exchange and verifier/provisioning behavior need an enabled API and trusted IdP |
| Email | Acceptance/events are covered; SMTP delivery, final transitions and contents need a controlled sink |
| Commerce | Selected detail/history permissions and missing-resource cases; checkout's defensive product-disappeared 404 needs controlled backend setup |
| Auth/account lifecycle | Full deletion cascade, refresh-family replay revocation, immediate access-token revocation and specialized MFA timing/race boundaries |
| AI | Real-model quality, reliable final-answer grounding, upstream failures and incremental latency; exact mutable catalogue comparisons need isolated data |
| Defect regressions | Prompt parsing/types, incompatible QR Accept and deleted-account JWT errors; see BUG-002–004 in [Bug reports](docs/bug-reports.md) |
| Isolation | Signup retains accounts; interrupted processes or API outages can prevent cleanup |

The mock/prose inconsistency (BUG-001) remains a documented limitation. Traffic
detail's historical 500 (BUG-005) did not reproduce on the 23 October recheck;
root cause/fix is unconfirmed. Overflow, load/concurrency, GraphQL and gRPC are
outside the measured scope.

Prioritize observable reset/SSO/mail infrastructure, then selected permission,
defect and cleanup gaps. Recount operation/spec links after contract or test
changes; record actual run dates and settings. Follow the
[contributor guide](docs/contributor-guide.md) and [README commands](README.md#commands).
Older delivery results are preserved in the [history tag](README.md#history).
