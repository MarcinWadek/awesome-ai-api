# MFA lifecycle tests

**Status:** completed, 23 October 2026. User-approved scope:
16 tests, implemented by the parent agent without subagents. The original approach
below was saved before implementation; delivered behavior and verification follow
at the end. Backend tests were reference evidence and were not executed.
Current coverage remains in the [coverage report](../../api-coverage-report.md).

## Why this needs a lifecycle

The six operations share enrollment state, a TOTP secret, one-time recovery codes
and short-lived login challenges. Tests need to own these dependencies without
sharing mutable accounts. The highest risks are issuing tokens before the second
factor, accepting a reused factor/challenge, and losing cleanup access after MFA
changes authentication.

Source evidence: backend `UserMfaController`, `MfaService`, `TotpService`,
`MfaProperties` and `MfaLifecycleControllerTest`, plus the saved OpenAPI contract.
Source defaults are six-digit SHA-1 TOTP, a 30-second period and one adjacent
time step; they do not prove deployed configuration. Setup returns the manual
secret, OTPAuth URI, QR data URI and expiry. Tests can generate codes directly;
an authenticator app and QR scanning are not needed to test the API lifecycle.

The source records `lastAcceptedTimeStep` when enrollment is confirmed and when
a TOTP is accepted for login or management. The same step cannot be used again
for that credential. Confirmation also revokes existing refresh tokens. Password
login with MFA enabled returns a challenge rather than an application session.
A subsequent password login invalidates the previous challenge. Recovery-code
replacement requires the password and a fresh TOTP; disable accepts the password
and either a TOTP or recovery code, and revokes refresh tokens.

## 1. Prove the deployed flow with one disposable account

Original exploration sequence (now executed; see the
[live evidence](../exploration/2026-10-23-mfa.md)):

1. Register an ordinary local-password account and retain its initial access
   token and refresh token in memory. Establish an independent observer for cleanup.
2. Read disabled status; start setup and inspect the OTPAuth parameters without
   logging the URI, secret or QR. Confirm pending enrollment has not enabled MFA.
3. Generate a current TOTP, confirm enrollment, check enabled status/recovery-code
   count, and verify that the original refresh token is rejected.
4. Password-sign-in again: verify a challenge is returned and access/refresh
   tokens are absent. Complete with a fresh TOTP, then use the issued access token
   on `/users/me` to prove the session belongs to the expected account.
5. Use a recovery code on a fresh challenge and verify it cannot be used twice.
   Reject replay of a completed challenge. Explore code replacement and disable,
   checking status and password-only login afterward.
6. Delete only this owned account and verify absence through the observer.

Actual responses, timing and cleanup are preserved in that dated exploration report.

## 2. Make timing and cleanup explicit

- Use a validated TOTP implementation; verify it independently against known
  test vectors. Read algorithm/digits/period from the setup URI and confirm
  compatibility with the target deployment before making assertions.
- Track the last submitted/accepted time step per account. When another TOTP
  action needs a fresh step, wait only until the next period plus a small margin.
  Avoid generating codes near a boundary. Bound waits and report timing failures;
  do not blindly retry 401 responses or advance into future steps to save time.
- Confirm local/server clock alignment during exploration. A server Date header
  is a diagnostic hint, not proof of the application clock. A fake client clock
  cannot control the remote backend clock.
- Each test gets an owned account; no worker-wide MFA account or shared admin.
  Run initial exploration with one worker. Increase test concurrency only after
  confirming isolation and rate-limit behavior.
- Use a dedicated MFA fixture, leaving the existing non-MFA auth fixture intact.
  Track enrollment and current session state. Explore whether the retained access
  JWT remains usable for owner cleanup after confirm/disable; provide an MFA-aware
  sign-in path if cleanup needs a new session. Ordinary password sign-in alone
  cannot be assumed to return tokens while MFA is enabled.
- Teardown deletes the owned account directly rather than relying on successful
  MFA disable. Verify absence independently and retain both test and cleanup
  failures. Keep secrets, challenge tokens, QR data and recovery codes out of
  assertion output, logs, traces and attachments.

## 3. Deliver automation in two small batches

Agreed allocation: status 2, setup 2, confirm 3, signin/2fa 3,
recovery-code replacement 3 and disable 3. Enrollment is 7 tests; the remaining
authentication/recovery batch is 9 tests. Related replay and persistence checks
are assertions inside these cases rather than additional test permutations.

| Batch | Operations | Selected business checks |
| --- | --- | --- |
| A: enrollment | GET status, POST setup, POST confirm | Disabled/pending/enabled state, consistent setup parameters, successful confirmation with unique recovery codes and refresh rejection, invalid confirmation preserves disabled state, missing authentication |
| B: authentication and recovery | POST signin/2fa, POST recovery-codes, POST disable | Password-only login issues no session; valid TOTP yields a usable session; completed challenge replay fails; recovery codes are single-use; replacement invalidates old codes; protected actions reject wrong credentials/factor without changing MFA state; disable restores password-only login and rejects old refresh tokens |

The agreed 16-case count was retained after exploration, grouping closely related
assertions into meaningful scenarios. Keep one spec per operation, clients in
setup, Given/When/Then steps and ascending response groups. Reuse fixture setup
without creating one large test whose failure hides every later operation.
Use fresh accounts for independent cases and fresh challenges for factor checks.
Select invalid-factor inputs that cannot accidentally match legitimate codes
in the confirmed accepted window.

For each batch, run new tests first with zero retries, then the full suite,
typecheck and whitespace checks. Update the coverage report only for operations
with implemented behavioral assertions; setup calls alone do not count.

## 4. Keep slower and specialized risks separate

Expiry, exact clock skew boundaries, rate-limit saturation and concurrent
challenge/recovery-code consumption need controlled clocks or isolated fault
conditions. The backend already contains source tests for several such rules;
review their assertions and execution separately rather than sleeping through
setup/challenge TTLs in live Playwright tests. Do not add a remote clock-control
endpoint or change backend code as part of this test-repository proposal.

Password-reset interaction with enabled MFA and provider-managed SSO accounts
are later integration scopes. Password reset still needs an observable reset
token; neither interaction should block the initial local-account lifecycle.

## Delivered scope and review

| Operation | Spec | Tests |
| --- | --- | --- |
| GET status | [2fa.status.get](../../tests/api/users/2fa.status.get.spec.ts) | 2 |
| POST setup | [2fa.setup.post](../../tests/api/users/2fa.setup.post.spec.ts) | 2 |
| POST confirm | [2fa.confirm.post](../../tests/api/users/2fa.confirm.post.spec.ts) | 3 |
| POST signin/2fa | [signin.2fa.post](../../tests/api/users/signin.2fa.post.spec.ts) | 3 |
| POST recovery-codes | [2fa.recovery-codes.post](../../tests/api/users/2fa.recovery-codes.post.spec.ts) | 3 |
| POST disable | [2fa.disable.post](../../tests/api/users/2fa.disable.post.spec.ts) | 3 |
| **Total** | Six operation specs | **16** |

Added [MfaClient](../../clients/mfa.client.ts), response/request
[types](../../types/mfa.ts), [MFA assertions](../../support/assertions/mfa.ts),
the [TOTP helper](../../support/totp.ts), and a lazy
[MFA fixture](../../fixtures/mfa.fixture.ts) with owned, pending and enrolled
account states. The existing authentication fixture and project configuration
were left unchanged. Individual tests retain Given/When/Then steps, ascending
expected response groups, disabled traces and zero retries. MFA specs allow
90 seconds to accommodate a bounded fresh-period wait and account cleanup.

The TOTP helper uses Node HMAC with an independently checked Base32 decoder,
reserves submitted steps, and avoids the last three seconds of a time period.
Known vectors came from
[RFC 6238 Appendix B](https://www.rfc-editor.org/rfc/rfc6238.html#appendix-B).
It supports the observed SHA-1/six-digit provisioning, with a period between
10 and 60 seconds, and fails explicitly on incompatible parameters. No new
dependency, fixed future-step code or retry of authentication failures was added.

Sign-in success asserts both a usable session and replay protection: an unused
recovery code on a consumed challenge is rejected without consumption, and the
used TOTP on a fresh challenge is rejected. Recovery-code reuse is also tested
on a new challenge. Invalid protected operations assert state preservation;
wrong-password replacement additionally proves an original recovery code still
works. Disable checks a refresh token from an actual post-MFA session, then
password-only login through `/users/me`.

A temporary serial fault probe deliberately failed after enrollment and replaced
the stored access token with an invalid one. Teardown recovered through password
challenge plus fresh TOTP, deleted the target, and a following test checked 404
through another ordinary account. The JSON report contained only the intended
test error, with no cleanup error. These two temporary cases were removed;
they are excluded from the permanent 16-test count.

## Verification results

| Check | Actual result |
| --- | --- |
| Live lifecycle exploration | Passed, including cleanup; [dated report](../exploration/2026-10-23-mfa.md) |
| TOTP reference vectors | 6/6 SHA-1 vectors matched at 8 digits and derived 6 digits |
| Initial focused MFA run, two workers, zero retries | **16/16 passed**, 1.6 minutes |
| Review run: three sign-in tests plus two temporary fault-probe cases | Four passed, one intentional expected failure; zero unexpected results, **39.7s** |
| Typecheck | Passed |
| Discovery / endpoint matrix | 169 tests in 53 files, 96 api / 73 admin; 49/53 operations have tests |
| Full api/admin regression, four workers, zero retries | **169/169 passed**, **4.0 minutes**; 96 api / 73 admin |
| Final matrix, local links and whitespace | Passed |

```powershell
npx.cmd playwright test tests/api/users/2fa tests/api/users/signin.2fa --project=api --workers=2 --retries=0
npm.cmd test -- --project=api --project=admin --workers=4 --retries=0
npm.cmd run typecheck
git diff --check
```

No subagents were used for this MFA delivery. The parent agent performed source
review, exploration, implementation, self-review and verification. No backend,
mock, environment secrets or shared account settings were changed. No application
defect was identified in the selected MFA scope. QR checks establish a PNG data
URI and valid framing; decoding the QR payload or scanning it in an authenticator
app is outside scope. Additional response variants, expiry/skew, saturation,
concurrent consumption, reset/MFA interaction and provider-managed MFA remain
deferred as described in the exploration record.
