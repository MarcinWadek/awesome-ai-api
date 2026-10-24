# Email and SSO endpoint tests

**Status:** selected deployment cases completed, 24 October 2026. Enabled SSO
success remains blocked on test infrastructure. Parent-agent work, without
subagents. Maintained coverage: [report](../../api-coverage-report.md).

## Evidence and selected scope

Reviewed saved OpenAPI and read-only backend email/SSO controller, DTO, service
and verifier source, plus [prior mail exploration](../exploration/2026-10-23-password-email.md).
Current anonymous capability probes on both awesome and aitesters returned
400 for missing `idToken` and 404 `SSO login is disabled` for a nonblank token.
The local Keycloak discovery URL on port 8082 was unreachable and no Docker CLI
or SSO/IdP settings were found in the current test setup. Backend test source uses
mocks for SSO controller success; it is not deployed token-exchange evidence.

Five focused tests are selected for the current environments:

| Operation | Cases |
| --- | --- |
| POST /api/v1/email | 200/empty body and one owned GENERIC event, with a fresh peer's events remaining empty; 400 invalid recipient with no event; 401 missing authentication. |
| POST /api/v1/users/sso/exchange | 400 missing ID token; 404 exact disabled-feature policy for a nonblank token. No Authorization is sent. |

SSO expectations are fixed to the observed disabled deployment: do not accept
either 401 or 404, skip the test or call disabled behavior valid-token coverage.
An enabled API plus a trusted IdP issuing tokens for disposable identities is
required for success, signature/issuer/audience validation, account linking and
conflict checks. Ask for available setup while completing independent email work.

Use a small EmailClient and DTOs, an AuthClient exchange method and the existing
registered-user/peer fixtures. Create no additional lifecycle abstraction.
All recipients are generated example.invalid addresses. Email acceptance is
checked against the current user's records, with a bounded five-second polling
window for recording rather than a wait for SMTP delivery. Metadata can reflect
QUEUED, SENT_TO_SMTP_SINK or FAILED; acceptance/event recording does not prove
handoff or delivery. No global outbox clear or unrelated account reads are needed.

Initialize clients in setup, use Given/When/Then steps and ascending status groups,
inherit disabled traces and use the configured redacting reporter. New cases run
first, then full regression with zero retries, typecheck, matrix/link reconciliation
and whitespace checks. Update the report to distinguish per-operation coverage
from SSO success and mail-delivery gaps even if all 53 operations have some tests.

## Results

Added [EmailClient](../../clients/email.client.ts),
[email DTOs](../../types/email.ts), an AuthClient exchange method and request
type, and two operation specs: [email](../../tests/api/email/index.post.spec.ts)
(three cases), [SSO](../../tests/api/users/sso.exchange.post.spec.ts) (two cases).
Existing auth fixtures and project configuration are unchanged. No new dependency,
skip, retry or runtime policy detection was introduced.

Email's positive case uses fresh owner/peer accounts and checks empty initial
lists, empty 200, a single masked GENERIC event and an empty peer list. Validation
also verifies no event was created. All recipients use generated example.invalid
addresses; no SMTP delivery or template rendering is asserted. SSO success remains
blocked by the explicitly disabled deployments and missing trusted test IdP.

Review checked account ownership, per-request Authorization, bounded event polling,
metadata-only assertions, exact SSO-disabled expectations and clear coverage limits.
[Current live evidence](../exploration/2026-10-24-email-sso.md) includes owned cleanup.
No subagents were used for this delivery.

| Check | Actual result |
| --- | --- |
| Capability / email isolation exploration | Completed as recorded in the dated report |
| Focused new tests, two workers, zero retries | **5/5 passed**, **4.7s** |
| Typecheck | Passed |
| Full api/admin regression, four workers, zero retries | **177/177 passed**, **4.2 minutes**; 104 api / 73 admin |
| Discovery / matrix | 177 tests in 57 files; 53/53 operations have direct behavioral checks |
| Local Markdown links and whitespace | Passed |

No application defect was identified in the selected cases. The SSO-enabled
happy path is not implemented or verified; a disabled-feature check is not a
substitute for token-verifier or identity-provisioning coverage. Mail delivery
and successful password reset also remain outside verified behavior.

```powershell
npx.cmd playwright test tests/api/email tests/api/users/sso.exchange --project=api --workers=2 --retries=0
npm.cmd test -- --project=api --project=admin --workers=4 --retries=0
npm.cmd run typecheck
git diff --check
```
