# Password recovery entry and invalid-reset tests

**Status:** completed, 24 October 2026. Implemented directly
by the parent agent without subagents. Current coverage is maintained in the
[coverage report](../../api-coverage-report.md).

## Selected scope: three tests

| Operation | Cases |
| --- | --- |
| POST /api/v1/users/password/forgot | One 202 case compares a known owned username with an unknown username: same generic public message and no raw token on the configured non-echo deployment. One 400 case checks the required identifier. |
| POST /api/v1/users/password/reset | One 400 case uses an unknown nonblank token and otherwise valid matching passwords. The proposed password must not authenticate; the original password must still produce a usable session for the same account. |

The [23 October exploration](../exploration/2026-10-23-password-email.md), saved
OpenAPI and read-only backend password DTO/controller/service source establish
the request shapes and expected behavior. Confirm the required-identifier response
on the current deployment before fixing that assertion. Record current HTTP
observations in a separate 24 October exploration report.

Add two small AuthClient methods and request/response types, using the existing
registered-user fixture, clients initialized in setup, Given/When/Then steps,
ascending response groups and zero retries. Do not add another account fixture.
Forgot and reset are called without Authorization. Generate only owned disposable
accounts with example.invalid email addresses; the known forgot request can queue
one reset email. No delivery wait or delivery assertion is part of this scope.

Keep password and token assertions from printing credentials. Use the configured
redacting reporter and inherited disabled traces. The existing owner-delete
fixture cleans accounts and related records, including generated reset state.
No shared credentials, password changes, MFA or global outbox operations are needed.

Run new tests first, then the full api/admin suite with zero retries, typecheck,
matrix reconciliation, local Markdown links and whitespace checks. Record actual
results here after execution; do not turn planned or manual checks into coverage.

## Limits

Reset coverage is **negative cases only**. Successful reset, token expiry/reuse,
post-success refresh revocation, reset/MFA interaction and mail delivery remain
unverified. A raw-token channel is still required for successful recovery. Null
token assertions target the configured non-echo API deployment; local profiles
that intentionally expose tokens require separately scoped expectations.

## Delivered implementation and verification

Added two methods to [AuthClient](../../clients/auth.client.ts), corresponding
[request/response types](../../types/auth.ts), and two operation specs:
[forgot](../../tests/api/users/password.forgot.post.spec.ts) (two cases) and
[reset](../../tests/api/users/password.reset.post.spec.ts) (one case).
The existing auth fixture, project configuration and shared credentials remain
unchanged. There are no new dependencies, fixtures, skipped cases or retries.

The current [exploration record](../exploration/2026-10-24-password-recovery.md)
preserves response observations and cleanup limits. Review checked public calls
omit Authorization, candidate passwords meet DTO constraints, token assertions
do not expose credentials, and failed reset is followed by proposed-password
rejection and a usable original-password session for the expected profile.

| Check | Actual result |
| --- | --- |
| Required-identifier probe | 400 with the expected field error |
| Focused tests, two workers, zero retries | **3/3 passed**, **5.0s** |
| Typecheck | Passed |
| Discovery | 172 tests in 55 files; 99 api / 73 admin |
| Full api/admin regression, four workers, zero retries | **172/172 passed**, **4.5 minutes** |
| Matrix, local Markdown links and whitespace | Passed; 51/53 operations have functional tests |

No application defect was identified in the selected scope. Successful reset
remains unverified despite both password endpoints now having functional tests.

```powershell
npx.cmd playwright test tests/api/users/password. --project=api --workers=2 --retries=0
npm.cmd test -- --project=api --project=admin --workers=4 --retries=0
npm.cmd run typecheck
git diff --check
```
