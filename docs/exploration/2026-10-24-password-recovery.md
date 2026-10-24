# Password recovery entry and invalid-reset verification

**Date:** 24 October 2026. **Target:** configured `api` host
`https://awesome.byst.re`. The parent agent performed this work without subagents.
Follow-up to [23 October password/email exploration](2026-10-23-password-email.md).

Sources: saved [OpenAPI](../api-docs.json), read-only backend password DTOs,
`PasswordResetController` and `PasswordResetService`. Deployment revision/profile
was not identified. No backend code or shared credentials were changed.

## Current HTTP observations

A bounded anonymous probe first checked omitted-identifier validation. Its sandbox
execution failed at request setup; the network-enabled retry returned 400 with
`{"identifier":"Identifier is required"}`. No account or email was created by
that probe. The new focused Playwright tests then exercised the remaining cases.

| Condition | Observed |
| --- | --- |
| Forgot for a newly registered owned username, without Authorization | 202 JSON, generic recovery message, null token |
| Forgot for a unique username never registered, without Authorization | Same 202, response fields and generic message, null token |
| Forgot with an omitted identifier | 400 JSON identifying the required field |
| Reset with an unknown nonblank token and valid matching proposed passwords | 400 JSON, `Invalid password reset token` |
| Sign-in using the proposed replacement password after rejected reset | 422 |
| Sign-in using the original password after rejected reset | 200, usable token; `/users/me` returned the expected profile |
| Generated-account cleanup | Owner right-to-be-forgotten returned 204 for both accounts |

The accepted public message was `If the account exists, password reset instructions
have been sent.` The tests check message/token values through booleans so a
regression does not print an unexpectedly returned reset token. Requests used
generated accounts and unique `example.invalid` emails; no shared account reset
was requested. Only the known forgot request could schedule an owned reset email.

## Cleanup and limits

The existing authentication fixture retained the original access token and
deleted both owned accounts in teardown, including the account that requested
reset instructions. It required 204; this batch did not independently inspect
all deleted reset/email records or add another observer account. Source deletes
those owned records, but scheduled email work may outlive the account. No sink
polling, inbox/outbox access, global clearing or delivery assertion occurred.

Reset coverage is **negative cases only**. The unknown token was not associated
with an account; the follow-up login checks establish that the selected owned
account's credentials were unaffected, not that a valid-token reset succeeds.
No successful password change, token expiry/reuse, successful-reset refresh
revocation, MFA interaction or stale-Bearer/rate-limit permutations were tested.

Null-token expectations target this non-echo deployment. Profiles intentionally
exposing reset tokens require a separate scope. Both requests returning the same
public body does not establish resistance to timing-based account enumeration.

Focused result: **3/3 passed**, 5.0 seconds, two workers, zero retries.
Full regression and maintenance checks are recorded in the
[implementation record](../implementation/password-recovery-entry-tests.md).
