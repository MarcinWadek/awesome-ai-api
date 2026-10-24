# Implementation records

| Scope | Record |
| --- | --- |
| Disposable registered-user authentication fixture and GET /users/me tests | [Registered-user auth fixture and profile tests](registered-user-auth-fixture-and-me-tests.md) |
| OpenAPI contract and authentication declarations, plus Swagger UI availability | [OpenAPI contract and Swagger UI tests](openapi-contract-and-swagger-ui-tests.md) |
| Documentation delivery: backend/mock review, parallel workstreams and prerequisite gates | [Parallel API delivery planning record](parallel-api-delivery.md) |
| Ollama definitions and generation/chat/tool streams | [Ollama streaming tests](ollama-streaming-tests.md) |
| Separate admin environment, authentication and disposable product examples | [Admin infrastructure and products](admin-environments-and-disposable-products.md) |
| Product/user CRUD gaps on staging | [Product and user CRUD](products-users-crud-gaps.md) |
| QR PNG, blank text and missing authentication | [QR creation](qr-create-tests.md) |
| Controlled traffic detail lookup and unknown ID | [Traffic details](traffic-detail-tests.md) |
| Staging cart item add/update/remove with owned users and products | [Cart item tests](cart-item-tests.md) |
| Commerce workflow coverage, isolated staging lifecycle and 23 October reduction to core risks | [Commerce workflow tests](commerce-workflow-tests.md) |
| Dedicated account deletion and basic email-event reads | [Account lifecycle tests](account-lifecycle-tests.md) |
| MFA lifecycle: 16 focused tests, timing, cleanup and verification | [MFA lifecycle tests](mfa-lifecycle-tests.md) |
| Password recovery entry and invalid-reset rejection | [Password recovery tests](password-recovery-entry-tests.md) |

Each record states whether it is proposed or completed and preserves its
implementation decisions and available verification results. Current coverage lives in the single
[API coverage and status report](../../api-coverage-report.md).

Save future implementation plans here with descriptive, lowercase,
hyphen-separated scope names. Keep simple implementation plans short and link the
root `api-coverage-report.md` for maintained coverage. Add each plan to
this index, update it through delivery, then mark it as a historical record with
actual verification results and links to current plans.
