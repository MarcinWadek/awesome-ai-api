# Password and email exploration

Explored 23 October 2026. The first runtime runner did not load the ignored `.env` because its path was relative to the wrong working directory; it used the source defaults `https://awesome.byst.re` and `https://aitesters.byst.re`. A corrected follow-up loaded `.env` relative to the runner and confirmed that both configured hosts matched those defaults. No credentials or tokens were recorded. The deployed profile for either host was not independently identified.

## Contract and source findings

The saved OpenAPI document defines `POST /api/v1/users/password/forgot` with `{ "identifier": "username-or-email" }` and a `202` response whether or not an account matches. The response has a generic message and nullable `token`; request validation returns `400`, and stale Bearer authentication can return `401`. `POST /api/v1/users/password/reset` takes `token`, `newPassword`, and `confirmPassword`; it returns an empty `200` on success and `400` for invalid token or payload. The backend DTO requires nonblank fields and an eight-character minimum new password.

Backend source shows that forgot looks up a local account by username or email, hashes the token for storage, and returns the raw token only when `password-reset.expose-token-in-response` is enabled. A reset updates the password, removes that user's refresh and reset tokens, and queues a confirmation email. Source profiles set token echo to true in `local`, and false in `aitesters` and `docker`; these settings do not identify the active deployment profile. Email-event metadata contains a masked recipient, event type, status, timestamps and optional failure reason. It does not contain the reset token.

`POST /api/v1/email` is Bearer-protected and returns an empty `200` when a message is accepted for asynchronous delivery. Its DTO validates `to` as an email address and requires nonblank `subject` and `message`. For an authenticated user, the backend records a `GENERIC` event as `QUEUED` before scheduling the send. The non-test delay generator chooses 10 seconds to 10 minutes; later status is `SENT_TO_SMTP_SINK` or `FAILED`. The event status describes handoff to the configured test sink, not inbox delivery.

`GET /api/v1/users/me/email-events` requires a Bearer token and returns up to 20 events for that user. Source contains a local outbox at `GET /api/v1/local/email/outbox`, available only in `local` and `aitesters`, and restricted to administrators. The `aitesters` profile also requires `X-Local-Outbox-Key`. Outbox entries contain complete email payloads, including reset links. Its DELETE route clears the entire shared buffer and is unsuitable for isolated test cleanup.

## Observed runtime behavior

The first disposable account used a unique username and an `example.invalid` email address. The bounded runner issued these operations and observed the following statuses:

| Operation | Result |
| --- | --- |
| Signup / signin | `201` / `200` |
| Empty owned email-event list / no-auth email-events request | `200` with zero entries / `401` |
| Forgot for the known username / an unknown email identifier | `202` / `202` |
| Forgot response comparison | Both had the same message, both included a nullable token field, and both tokens were null |
| Reset with an invalid token | `400`; signing in with the original password still returned `200` |
| Authenticated email request with malformed recipient / no-auth email request | `400` / `401` |
| Authenticated email to the controlled recipient | `200` |
| Immediate owned email-event read after the requests | Two matching owned events, `PASSWORD_RESET_REQUESTED` and `GENERIC`, both `QUEUED` |
| Owner right-to-be-forgotten cleanup | `204` |

No response bodies containing credentials, tokens, or message contents were written to output. The second disposable account was also deleted with `204`. A subsequent GET for its username using that deleted account's stale JWT returned `500`; this was not an independent absence check and no response body was inspected. Treat it as an unresolved observation, not proof that cleanup failed or that absence was verified.

The first runner's admin subprobe used the cwd-relative `.env` path, so its empty login attempt returned `422` and it did not request the outbox. The corrected follow-up loaded the configured admin credentials: signin at `aitesters.byst.re` returned `200`, while a read-only GET of its local outbox returned `403`. No `LOCAL_EMAIL_OUTBOX_ACCESS_KEY` was present in the repository `.env`, and the runner sent no key. The `403` is consistent with the source's administrator and optional key protections, but the response body was not inspected, so its exact cause and the active profile remain unconfirmed. No outbox body was read. This admin host is separate from `awesome.byst.re`; its response does not establish delivery or token availability for the API host, and no conclusion was reached about whether a configured key would grant access.

## Reproduction and cleanup

The disposable runners are gitignored under `exploration-results/`:

- `node exploration-results/password-email-runner.mjs` ran the password, email-event and controlled-send probes against the default API host, which the corrected follow-up confirmed matched `API_BASE_URL` in `.env`. The recorded API observations came from this pre-correction runner; the runner now loads `.env` relative to its own location for future reproduction.
- `node exploration-results/password-email-outbox-and-cleanup.mjs` checked the separate admin outbox access and verified the second account's delete response.

The first sandboxed run failed DNS resolution before signup and created no account. The same runner was then executed with network escalation and completed using its default API host. Both created accounts received an owner-triggered right-to-be-forgotten request returning `204`. The only email recipients were unique `example.invalid` addresses. No global outbox clear, shared admin mutation, password change, MFA operation, or delivery polling was performed.

## Automation prerequisites and next batch

The current target supports an immediate negative-case package: assert the generic `202` response for known and unknown identifiers, then reject an invalid reset token with `400` and prove the original password still works. These checks do not depend on mail access or token echo. Keep successful password recovery explicitly uncovered until a raw token can be read safely.

For email sending, runtime evidence supports an authenticated accepted-send assertion and a user-owned `GENERIC` event assertion. The event was `QUEUED` immediately after sending; no sink delivery was observed. A future event assertion should account for the asynchronous state transition and should not claim delivery based only on HTTP `200` or the event record. Missing authentication and malformed recipient are independently automatable (`401` and `400`).

Successful recovery remains blocked on `awesome.byst.re`: known-account forgot returned a null token, and no accessible controlled inbox or outbox was established. The separate `aitesters` outbox returned `403`; the local `.env` supplied no access key, and the exact denial cause/profile were not established. The concrete next prerequisite is an approved, owned token channel for the selected test environment—either an enabled test-profile token echo or scoped access to that account's reset email in a controlled sink. Do not use event metadata as a token source or clear the shared outbox.
