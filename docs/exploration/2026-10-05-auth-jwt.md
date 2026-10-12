# JWT assessment

Assessed on 2026-10-05 against `https://awesome.byst.re` using real `curl.exe` requests and the test account configured in `.env`. The complete curl exploration was repeated with a fresh login and produced the same outcomes. No passwords, access tokens, refresh tokens, or user response bodies are included here.

**Conclusion: login access tokens work on the checked protected endpoints as documented. Authentication, role restrictions, signature checks, and refresh rotation work. Refresh replay handling differs from the local backend source, and there are HTTP authentication compatibility issues. This is an assessment of the checked flows, not proof that every protected operation or security property is correct.**

`docs/api-docs.json` and the live `GET /v3/api-docs` response were identical as parsed JSON. The scheme is `bearerAuth`, type `http`, scheme `bearer`, format `JWT`; protection is declared on individual operations rather than globally.

## Observed access flow

1. `POST /api/v1/users/signin` with valid username/password and no Authorization header returned `200`.
2. The response included `token` (access JWT), `refreshToken`, account identity, `roles: ["ROLE_CLIENT"]`, and `mfaRequired: false`.
3. The JWT header specified `HS512`. Its claims were `sub`, `auth`, `iat`, and `exp`; the subject matched the account and `exp - iat` was 3,600 seconds (one hour).
4. Sending `Authorization: Bearer <token>` authenticated subsequent requests without a cookie jar or session cookie.
5. `POST /api/v1/users/refresh` with JSON `{ "refreshToken": "<refreshToken>" }` returned a replacement access JWT and refresh token. The replacement access JWT successfully authenticated `/api/v1/users/me`.

JWT decoding alone does not prove validity. Successful authenticated requests and rejected signature changes provided the practical verification here.

## Protected endpoint results

All requests below were GET requests. `/users/me` also returned the identity of the account used to sign in.

| Endpoint | Valid client access JWT | No Authorization header |
| --- | --- | --- |
| `/api/v1/users/me` | 200 | 401 |
| `/api/v1/products` | 200 | 401 |
| `/api/v1/cart` | 200 | 401 |
| `/api/v1/orders` | 200 | 401 |
| `/api/v1/users/2fa/status` | 200 | 401 |
| `/api/v1/ollama/chat/tools/definitions` | 200 | 401 |
| `/api/v1/admin/inventory` | 403 | 401 |
| `/api/v1/orders/admin` | 403 | 401 |

The admin responses are expected: a valid client token establishes identity but does not grant administrator permissions. This matches the role requirements and response codes in the document.

## Negative requests

| Request | Observed result |
| --- | --- |
| Malformed Bearer token on `/users/me` | 401, `Invalid or expired token` |
| JWT with altered signature | 401, `Invalid or expired token` |
| JWT with altered subject and admin role claim, original signature | 401, `Invalid or expired token` |
| Unsigned token with `alg: none` | 401, `Invalid or expired token` |
| Refresh token used as a Bearer access token | 401, `Invalid or expired token` |
| Access JWT without the `Bearer ` prefix | 401, `Unauthorized` |
| Valid JWT with lowercase `bearer ` prefix | 401, `Unauthorized` |
| Correct login credentials plus invalid Bearer header | 401, `Invalid or expired token` |
| Incorrect login password | 422, `Invalid username/password supplied` |
| Access JWT submitted as a refresh token | 401, `Invalid refresh token` |

The stale-header login behavior is explicitly documented. Public login means no token is required; it does not mean an invalid token will be ignored. Clients should omit Authorization on sign-in and refresh requests.

## Refresh replay finding

The following sequence was reproduced twice, each time using a separate login:

| Sequence | Observed result |
| --- | --- |
| Login issues access token A and refresh token R1 | 200 |
| Refresh R1, receiving access token B and refresh token R2 | 200; both token values changed |
| Call `/users/me` with B | 200 |
| Call `/users/me` with original A | 200 |
| Replay consumed R1 | 401 |
| Refresh R2 after replaying R1 | **200** |
| Call `/users/me` with B after the replay | 200 |

Basic single-use refresh rotation matches the OpenAPI description: R1 cannot be used twice. However, the local backend's `RefreshTokenService.rotateToken` explicitly revokes the token family when a consumed token is replayed. If that implementation were effective on the live deployment, R2 would return `401` after the R1 replay. The observation establishes a source/deployment behavior discrepancy; the exact cause needs investigation in the deployed code and database state. OpenAPI does not explicitly promise family revocation, so this is not a direct contradiction of its refresh description.

Replay detection that invalidates the active refresh token is a useful security property: otherwise someone holding the replacement can continue refreshing despite detection of reuse. [RFC 9700, section 4.14.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2) describes this model for OAuth refresh tokens; this app's custom login API is not being classified as a full OAuth implementation.

Continuing validity of access token A after refresh is expected from the source: refresh rotation does not revoke access JWTs.

## Local implementation review

The backend is in the sibling `test-secure-backend` directory. These findings describe that checkout; identical live OpenAPI does not establish identical deployed implementation.

- `security/JwtTokenProvider.java`: signs access JWTs with a symmetric HMAC key; JJWT `parseSignedClaims` verifies signatures and expiry. The live token used HS512. Authentication reloads user details and authorities from the database, rather than trusting role claims alone.
- `security/JwtTokenFilter.java` and `WebSecurityConfig.java`: use a stateless Spring Security filter chain. Unauthenticated protected requests return 401; denied role access returns 403. JWT processing precedes public endpoint authorization, explaining why stale tokens block login.
- `service/token/RefreshTokenService.java`: stores SHA-256 token hashes, uses a write lock during rotation, tracks consumed tokens and token families, and revokes a family on detected replay. The default generator uses 32 random bytes; the server profile enables legacy UUID formatting. Live refresh tokens had 36 characters, consistent with that legacy format; length alone does not prove the generation algorithm or storage behavior in production.
- `controller/users/UserLogoutController.java` and `service/UserService.java`: logout removes **all refresh tokens for the account**. There is no access-token denylist or session-version validation in the reviewed access path. Therefore existing access JWTs can remain usable until expiry, provided the account still exists. This matches the documented refresh-only logout behavior, but clients must not assume immediate access-token invalidation.
- `JwtTokenProvider.init`: secure-key enforcement defaults to false, and short development keys are expanded by repetition. Repetition does not add entropy. Production should require a high-entropy signing key, with sufficient length for the selected HMAC algorithm. The actual production signing secret was not inspected or tested. [JWT best practices](https://www.rfc-editor.org/rfc/rfc8725#section-3.5) require sufficient key entropy.
- Access tokens do not include `iss`, `aud`, or `jti`, and the parser does not require issuer/audience. Their absence is not automatically invalid JWT usage, but explicit issuer/audience checks would help prevent token substitution if keys or token consumers are shared. [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725#section-3.9) discusses issuer and audience validation.

## HTTP compatibility findings

The live app rejects lowercase `bearer` despite accepting the same JWT with `Bearer`. The source uses a case-sensitive `startsWith("Bearer ")`. HTTP authentication schemes are case-insensitive under [RFC 9110, section 11.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-11.1), so this is a compatibility defect.

The unauthenticated `/users/me` response returned 401 and a JSON error, but no `WWW-Authenticate` header. [RFC 9110, section 15.5.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.2) requires a challenge on a 401 response. Return an appropriate Bearer challenge from the authentication error handlers.

## Reproduce the basic flow with curl in PowerShell

Set `API_BASE_URL`, `API_LOGIN_USERNAME`, and `API_LOGIN_PASSWORD` in your shell first. This example keeps the login body on stdin and captures the response rather than printing tokens. PowerShell does not automatically load `.env`.

```powershell
$base = $env:API_BASE_URL.TrimEnd('/')
$payload = @{
    username = $env:API_LOGIN_USERNAME
    password = $env:API_LOGIN_PASSWORD
} | ConvertTo-Json -Compress
$session = ($payload | curl.exe --silent --show-error --max-time 30 `
    "$base/api/v1/users/signin" -H 'Content-Type: application/json' `
    --data-binary '@-') | ConvertFrom-Json

curl.exe --silent --show-error --max-time 30 --output NUL `
    --write-out '%{http_code}' "$base/api/v1/users/me" `
    -H "Authorization: Bearer $($session.token)" # 200

curl.exe --silent --show-error --max-time 30 --output NUL `
    --write-out '%{http_code}' "$base/api/v1/users/me" # 401

$refreshPayload = @{ refreshToken = $session.refreshToken } | ConvertTo-Json -Compress
$renewed = ($refreshPayload | curl.exe --silent --show-error --max-time 30 `
    "$base/api/v1/users/refresh" -H 'Content-Type: application/json' `
    --data-binary '@-') | ConvertFrom-Json
```

For an MFA-enabled account, the initial login may return a challenge instead of tokens. Complete `/signin/2fa` before using the protected-route example.

## Scope and follow-up

Natural one-hour access expiry, refresh expiry, MFA completion, administrator success, account deletion/disable, concurrency, and mutation endpoints were not exercised. Logout was reviewed in source rather than called, because it revokes every refresh session belonging to the shared configured account. No accounts or business records were created. The exploration issued and rotated refresh tokens for its own login sessions.

Prioritize investigation of refresh-family replay behavior, then fix Bearer scheme case handling and 401 challenge headers. Verify production signing-key enforcement. Extend the existing sign-in coverage to call `/users/me`: its current test named "returns a usable session token" checks only that the token is nonempty. No automated test files or application code were changed during this assessment.
