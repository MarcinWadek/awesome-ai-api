# Signup exploration — 2026-10-04

Explored `POST https://awesome.byst.re/api/v1/users/signup` using Playwright's HTTP client, following `README.md` and `docs/api-docs.json`. The sibling backend source helped select cases; observations below come from the live deployment.

Performed 51 signup requests: 8 returned `201`, 35 returned `400`, and 8 returned `401`. Including sign-in, profile checks, and cleanup, performed 76 requests. All eight accounts created during exploration were authenticated, inspected through `GET /api/v1/users/me`, and deleted through their own `DELETE /api/v1/users/{username}/right-to-be-forgotten` endpoint; every deletion returned an empty `204`. Existing accounts were not modified. No automated signup suite has been added.

## Observed behavior

| Case | Live result |
| --- | --- |
| Valid unique payload with all five fields | `201`, empty body; no JSON content type or Location header |
| Minimum lengths: username/name fields 4, password 8 | `201`; new account can sign in |
| Username, firstName, and lastName each 255 characters, with a normal password | `201`; stored values match the supplied strings |
| Any required field omitted or null | `400`, flat field-to-message JSON map |
| Empty username, password, firstName, or lastName | `400`, field validation error |
| Username/name fields 3 characters, or password 7 characters | `400`, field validation error |
| Username/name/password fields 256 characters | `400`, field validation error |
| Duplicate username only | `400`, `{"message":"Username is already in use"}` |
| Duplicate email only | `400`, `{"message":"Email is already in use"}` |
| Both username and email duplicated | `400`, username duplicate message takes precedence |
| Email `not-an-email`, `a@`, or surrounded by spaces | `400`, `{"email":"Email should be valid"}` |
| Email `a@localhost` | `201`; accepted without a dotted domain |
| Empty email string | `400`, `{"message":"Email is already in use"}`; reaches uniqueness checking rather than rejecting the email format |
| Password 72 ASCII bytes | `201`; sign-in succeeds |
| Password 73 ASCII bytes, 255 ASCII characters, or 37 `é` characters (74 UTF-8 bytes) | `400`, `{"error":"password cannot be more than 72 bytes"}` |
| First and last names consisting of four spaces | `201`; spaces preserved in profile |
| Password consisting of eight spaces | `201`; sign-in succeeds with that password |
| Extra property and `roles: ["ROLE_ADMIN"]` in a valid payload | `201`; sign-in and profile report only `ROLE_CLIENT` |
| Empty object | `400`, validation messages for all five fields |
| Malformed JSON, no body, JSON `null`, object-valued username, or `text/plain` body | `401`, `{"message":"Unauthorized"}` |
| Malformed JSON or `text/plain` body with a valid Bearer token | Still `401`, `{"message":"Unauthorized"}` |
| Otherwise valid payload with an invalid Bearer token | `401`, `{"message":"Invalid or expired token"}` |

Responses consistently contained `Cache-Control: no-cache, no-store, max-age=0, must-revalidate` and `Pragma: no-cache`. Errors used a JSON content type; success had an empty body. Signup did not return session tokens. Separate sign-in returned usable tokens and the expected user identity; profile responses contained no password or password hash.

## Findings to resolve before fixing expectations in tests

1. **Password contract mismatch.** OpenAPI advertises 8–255 characters, but the encoder rejects values above 72 UTF-8 bytes. A 37-character Unicode password can therefore fail within the documented character limits. Test bytes separately from character count; clarify the intended public limit.
2. **Misleading request errors.** Invalid JSON, missing bodies, incompatible field types, and unsupported content types return an authentication error, including when authenticated. Treat this as an observed defect candidate; avoid making `401` the intended contract for these cases without agreement.
3. **Empty email validation gap.** An empty string reached a duplicate-email error on this deployment. The backend uses `@NotNull` and `@Email`, without a nonempty constraint. The observed response depends on existing database contents and is unsuitable as a stable validation assertion.
4. **Whitespace and email policy need a decision.** Blank names, an all-space password, and a single-label email domain are accepted. The documented length constraints do not forbid blank strings. These are policy questions rather than explicit contradictions of the documented lengths.
5. **Upper-bound messages are misleading.** A 256-character username or name produces the same “Minimum … length: 4 characters” message as an undersized value. Password size validation similarly says “Minimum password length: 8 characters” when over 255 characters.

Error envelopes have three forms: validation errors keyed by field, business/authentication errors under `message`, and the password encoder error under `error`. Do not reuse the signin suite's `ApiErrorResponse` type for all signup failures.

## Suggested automated coverage

- **201:** unique valid signup; empty response and no-store headers; sign-in and profile identity; minimum lengths; maximum username/name lengths using a short password; role injection cannot grant admin privileges. Always clean up in `finally` using the newly created account's token.
- **400:** parameterize omitted/null/empty fields and lengths immediately below/above boundaries; malformed email; duplicate username, email, and both. Hold the original account until duplicate checks finish, and generate distinct identities for independent tests.
- **Password boundaries:** cover 72/73 ASCII bytes and a multibyte password crossing 72 bytes. Keep the documentation mismatch visible until the intended limit is agreed.
- **401:** invalid Bearer token on this public endpoint. Put malformed-body/content-type cases in a separate defect-focused group until their contract is clarified.
- **Policy cases:** blank names/password, empty email, domain format, and unknown properties, based on the agreed requirements.

The supplied source has an optional signup rate limiter with defaults of 10 requests per IP per hour, disabled by default. No `429` was observed; deployment configuration was not inspected and the rate limit was not deliberately exhausted. Verify `429` and any retry headers in a controlled environment with a known policy. Parallel tests and retries must account for shared IP limits.

Not explored: duplicate identity case sensitivity/normalization, simultaneous duplicate registrations, email length boundaries, or other HTTP methods. Cleanup was verified by successful `204` responses, without database inspection.

Local diagnostic artifacts (gitignored):

- `test-results/signup-exploration.cjs` — ad hoc exploration runner; reads `API_BASE_URL` from configuration and generates temporary credentials.
- `test-results/signup-exploration-results.json` — first-run responses, with tokens redacted. Password-keyed validation messages were also redacted in this run.
- `test-results/signup-exploration-followup.json` — isolated follow-up responses, with tokens redacted and validation messages preserved.

The runner performs live writes and cleanup, so rerunning it consumes API quota and creates fresh temporary accounts. The Markdown report is the durable record; generated diagnostics can be replaced by later test runs.
