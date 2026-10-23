# Parallel API delivery: repository review and baseline

Reviewed on **7 October 2026**. This is a source/coverage audit and an existing-suite
rerun, not a new live endpoint exploration. Backend and mock working trees were
clean when inspected. Sources: API tests `5187613`, backend `32eb381`, mock `9768885`.
The configured live API is `https://awesome.byst.re`; deployed revision/profile and
upstream type were not independently established.

Maintained coverage: [API coverage report](../../api-coverage-report.md). Delivery document:
[parallel delivery planning record](../implementation/parallel-api-delivery.md).

## Contract sources inspected

| Area | Source paths relative to its repository | Existing API evidence |
| --- | --- | --- |
| Security/users | Backend `src/main/java/com/awesome/testing/security/WebSecurityConfig.java`; `controller/users/UserEditController.java`, `UserDeleteController.java`, `UserRightToBeForgottenController.java`; `service/UserService.java`; `fakedata/SetupUsers.java` | `fixtures/auth.fixture.ts`, AuthClient/UsersClient, users specs and [users specs](../../tests/api/users) |
| Products/inventory | Backend `controller/ProductController.java`, `AdminInventoryController.java`; `service/ProductService.java`, `InventoryService.java`; product DTOs; `fakedata/SetupData.java`, `SetupProducts.java`, `SetupOrders.java`; `src/main/resources/bootstrap/products.json` and DB migrations V1/V4 | ProductsClient, product read specs and [product read specs](../../tests/api/products) |
| Commerce | Backend `controller/cart/CartItemsController.java`, `controller/OrderController.java`; `service/CartService.java`, `OrderService.java`; cart/address/order DTOs; order/cart/inventory entities and FK migrations | CartClient and [cart read/clear exploration](2026-10-06-users-cart.md), [cart specs](../../tests/api/cart) |
| Password/mail | Backend `controller/users/PasswordResetController.java`, `UserEmailEventController.java`; `controller/EmailController.java`, `controller/email/LocalEmailOutboxController.java`; `service/password/PasswordResetService.java`, `LocalEmailOutbox.java`; `service/EmailService.java`, `service/email/EmailEventService.java`, `service/delay/RandomDelayGenerator.java`; profile YAML and PasswordResetProperties | Saved OpenAPI; no password/email-event operation specs currently exist |
| Traffic | Backend `controller/TrafficController.java`; `traffic/TrafficSession.java`, `TrafficLoggingFilter.java`, `TrafficCapturePolicy.java`; application/server configuration | TrafficClient and controlled-session `logs.get.spec.ts`; [traffic specs](../../tests/api/traffic) |
| QR | Backend `controller/QrController.java`, `service/QrService.java`, `dto/qr/CreateQrDto.java`; common suite Accept configuration | Saved OpenAPI; no QR client/spec currently exists |
| Backend LLM | Backend `controller/OllamaController.java`; `service/ollama/OllamaService.java`, `OllamaFunctionCallingService.java`, `OllamaRequestHandler.java`; product function handlers/registry; `service/prompt/PromptInjector.java`; `controller/exception/OllamaExceptionHandler.java`; request DTOs/profile upstream URLs | Saved OpenAPI; no Ollama client/stream helper/spec currently exists |
| Mock LLM | Mock `src/main/java/com/awesome/testing/ollama/controller/*`; `service/GenerateService.java`, `ChatService.java`, `ChatToolsService.java`; scenario repositories; `util/TokenStreamUtils.java`; `src/main/resources/scenarios/{generate-scenarios,chat-dialog-scenarios,chat-scenarios}.json`; application.properties and README | Existing mock controller tests inspected for supporting contract context; not executed in this documentation task |

Java backend paths without a full prefix in the table are under
`src/main/java/com/awesome/testing/`. Cross-checked operation names, roles and
response codes with `docs/api-docs.json`, all existing clients, fixture lifecycle,
the former endpoint plans and prior exploration/implementation records.
Coverage is now maintained only in the API coverage and status report.

## Findings and implications

- Existing 59-test coverage is retained. Cart item POST is setup for populated
  clearing; dedicated item tests remain unstarted. Refresh/logout and product,
  traffic, cart and user read/prompt clients already exist.
- Signup creates ROLE_CLIENT. Bootstrap admin existence does not establish usable
  deployment credentials. Method-level admin checks protect product mutations,
  user deletion and order admin operations. Owner edit/forget combines existence
  checks and authorization; deployed missing-user responses need verification.
- Cart addition accumulates quantities, update replaces quantity and zero removes
  an item. Availability checks do not reserve stock. Checkout deducts stock and
  clears the cart, so safe parallel checkout needs test-owned products. Forget
  deletes orders without restoring stock. Clear/delete user-owned references
  before deleting products, and verify DB/profile cleanup including movements.
  Demo seeding requires app.seed-demo-data.enabled=true outside the test profile;
  seeded users/orders/carts are shared demonstration data, not owned test fixtures.
- Client order detail hides peer orders with 404; peer cancellation is 403.
  Cancellation is allowed from PENDING/PAID only and restores deducted inventory.
  Admin non-CANCELLED status values are assigned directly; a broader transition
  state machine must not be invented for negative tests.
- Empty events/orders and tool definitions are independent reads. Nonempty owned
  order assertions need order setup; nonempty email events need a controlled action.
  Event metadata does not expose reset tokens or prove delivery to an external inbox.
- Local reset token echo can unblock reset success without mail delivery; aitesters
  and docker disable echo. Outbox is local/aitesters-only, requires admin, and may
  require an access key. Global outbox clear is unsafe with concurrent consumers.
  Non-test send delay is 10 seconds to 10 minutes, so outbox presence alone does
  not make mail tests fast or deterministic. Select an observable token path and
  verified delay budget; avoid fixed sleeps.
- Traffic tests already generate captured requests in unique sessions. Detail
  success needs a listed correlation UUID; the filter generates it server-side.
  Session lookup enforces isolation. Default legacy-public is false; server profile
  enables it. Existing live tests exercise legacy mode, not protected mode.
- QR requires compatible Accept negotiation and binary PNG assertions; the suite's
  default Accept is JSON. Error negotiation remains a live verification item.
- Mock streaming is NDJSON; backend output is SSE. Mock nonblank models are echoed,
  not checked against a model registry. Unknown prompts produce successful fallback
  content, not missing-model errors. Source token delay is 50ms while README says
  150ms. The backend validates nonblank models and generate forces stream:true.
  Direct mock chat permits model omission, but mock generate DTO rejects it even
  though its service has a fallback; README's generic omission guidance is too broad.
- Tool-enabled backend requests go to upstream `/api/chat`, where the mock routes
  nonempty tools to tool scenarios. The backend executes product tools, emits tool
  results and starts further iterations. Intermediate upstream done:true cannot
  terminate collection. Preserve token whitespace, consume through EOF, and check
  the final phase. IDs/timestamps are generated; tool payloads use actual catalogue
  data; canned final prose is not evidence that catalogue facts are correct.
  Backend injects the user's chat/tool system prompts and has a default 8-iteration
  cap. Mock selection uses user/tool messages, so deterministic output does not
  establish system-prompt effectiveness or real-model grounding.
- Saved OpenAPI also includes admin inventory, MFA and SSO operations absent from
  the old root matrix. Inventory is a staged admin/data extension; MFA/SSO need
  separate prerequisite exploration. Local outbox is source-only/profile-dependent
  support. GraphQL/gRPC remain outside this REST planning task.
- Signup specs do not currently clean up created accounts. Other tests use the
  lifecycle fixture, whose teardown does not cover partial signup/signin failure
  or intentionally deleted users. Record these shared-fixture cleanup gaps without changing
  current completion statuses or silently implementing fixes in a planning task.

## Validation and limits

1. Initial `npm run test:api` invocation was blocked by PowerShell policy for
   npm.ps1. Using npm.cmd avoided that shell issue.
2. Sandboxed `npm.cmd run test:api -- --workers=2 --retries=0` discovered 59 tests;
   all failed with `connect EACCES` before live API responses. No behavioral
   conclusions or new probe data were obtained from that attempt.
3. Automatic review initially rejected the network-enabled rerun over explicit
   destination/payload authorization. The user then authorized running the existing
   suite against `https://awesome.byst.re`, including generated credentials/test
   data and configured login credentials. The approved rerun completed:
   **59/59 passed, 40.1s, two workers, zero retries**.
4. `npm.cmd run typecheck` passed. Final documentation checks are recorded in the
   [delivery record](../implementation/parallel-api-delivery.md).

The successful run revalidates existing auth, public traffic, product reads,
user/prompt, cart read/clear and docs assertions. It does not verify unimplemented
admin, checkout, password, email, QR or LLM cases. No new tests or backend/mock
changes were made; Maven suites were not run.

Raw baseline console output is in gitignored
`exploration-results/parallel-plan-baseline.log`; this report contains the durable
result without storing credentials, tokens or raw traffic bodies. Fixture-owned
account/cart cleanup completed within passing tests; original signup spec account
cleanup remains a documented gap. No extra mutation/side-effect probes were run.

## Needs verification before dependent implementation

Admin credentials/role/MFA; active profile and outbox key; sink/delay control;
inventory cleanup in the target database; deployed upstream model/error
capabilities; scenario-compatible product data; QR error negotiation; and
missing-user edit/forget status. These prerequisites describe the 7 October review.
The [coverage report](../../api-coverage-report.md) tracks current coverage,
remaining blockers and next actions; it replaced both root plans on 23 October.
