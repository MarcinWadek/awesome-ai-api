# Implementation plan: registered-user authentication fixture

Status: implemented and validated. Typecheck passed, all four new `/users/me` tests passed, and the full suite passed (15 tests) with two workers and zero retries. Live tests required HTTPS access outside the network-restricted sandbox.

## Outcome

Create a reusable Playwright fixture that generates a unique user, registers that user, and signs in with the generated credentials. Return both the registration details and the access JWT for future API tests. Start by covering `GET /api/v1/users/me` and proving that the returned JWT resolves to the newly registered account.

## Fixture contract and lifecycle

Add `fixtures/auth.fixture.ts`, extending Playwright's base `test` with a fixture named `authenticatedUser`. Export the extended `test` and `expect` for consuming specs.

```typescript
interface AuthenticatedUser {
  user: RegistrationRequest;
  token: string;
}
```

`user` contains the generated username, password, email, first name, and last name. `token` is the non-null access JWT returned in the login response's `token` field. Consumers add `Authorization: Bearer <token>` when making protected requests.

Use a **test-scoped, lazy fixture**: each test that requests `authenticatedUser` receives its own newly registered account and token. Tests that do not request it perform no signup or login. This avoids shared account state across parallel tests and retries.

Fixture setup uses two named `test.step` calls, as agreed during review:

Generate data with `generateRegistrationData()` before the setup steps.

1. **Register a unique test user:** register through `AuthClient.signUp(user)` and require HTTP 201 before continuing.
2. **Sign in as the registered user:** call `AuthClient.signIn({ username, password })`, require HTTP 200, and extract a nonempty access token. Narrow the nullable `LoginResponse.token` to `string`.

The fixture focuses on creating a usable account and sharing its token. Profile, role, response-header, and response-body contract assertions belong in endpoint tests.

Yield `{ user, token }` after those setup steps. After `await use(...)`, delete the generated account in one teardown step through `/right-to-be-forgotten` and require 204. Keep the lifecycle linear: register, sign in, use, delete. There is no login retry or cleanup fallback for setup failures.

Use the existing `request` fixture and its configured base URL for signup/login. Do not attach JWT authorization globally or mutate request defaults: signup/login must omit Authorization, and negative endpoint tests need an unauthenticated request.

Do not call `/users/me` inside fixture setup. Keep the fixture reusable across endpoints and make the first protected request the responsibility of the endpoint test.

## Files and responsibilities

| File | Planned change |
| --- | --- |
| `fixtures/auth.fixture.ts` | Add the fixture contract, registration/login setup, and exported extended `test`/`expect`. Configure `trace: 'off'` on the exported test because setup sends generated passwords and receives tokens. |
| `clients/users.client.ts` | Add `UsersClient.getMe(token?: string): Promise<APIResponse>`, sending a Bearer header only when a token is supplied, and `forgetUser(username, token)` for cleanup. Encode usernames in deletion paths. |
| `types/users.ts` | Add `UserResponse` matching the documented `UserResponseDto`: numeric `id`, username, email, roles, nullable first name and last name. Reuse `LoginResponse['roles']` for the role type. |
| `tests/api/users/me.spec.ts` | Add the endpoint tests below, importing the extended fixture test. |
| `README.md` | Document fixture usage, return fields, lazy test scope, trace policy, and the command for the new spec. |

Reuse the existing registration generator, request/response types, `AuthClient`, HTTP assertions, and configuration. Keep existing signup and signin specs intact; migrating them to the new fixture is outside this initial change.

Example intended usage:

```typescript
import { test, expect } from '../../../fixtures/auth.fixture';
import { UsersClient } from '../../../clients/users.client';

test('returns the newly registered account', async ({ request, authenticatedUser }) => {
  const { user, token } = authenticatedUser;
  const response = await test.step('Get the authenticated user', () =>
    new UsersClient(request).getMe(token),
  );

  await test.step('Verify the registered identity', async () => {
    expect(response.status()).toBe(200);
    expect((await response.json()).username).toBe(user.username);
  });
});
```

The implemented success test will make the fuller assertions listed below.

## Initial `/users/me` coverage

Organize tests by response code ascending: `200`, then `401`. The operation documents only those two response codes, so do not add unrelated 400 or 404 cases. Wrap request and assertion phases in `test.step`.

| Group | Test | Assertions |
| --- | --- | --- |
| 200 | Newly registered user can retrieve their own account | HTTP 200; JSON; `Cache-Control` contains `no-store`; positive integer `id`; username, email, first name, and last name equal generated values; roles equal `['ROLE_CLIENT']`; no `password`, `token`, or `refreshToken` properties in the profile response. |
| 401 | No Authorization header | HTTP 401; JSON; no-store; authentication error has a nonempty `message`. Do not request `authenticatedUser`, so this case creates no account. |
| 401 | Malformed Bearer token | Same 401/error-envelope checks using a fixed invalid token. Do not request `authenticatedUser`. |
| 401 | Altered JWT signature | Request `authenticatedUser`, change the first character of the JWT signature segment to a different valid base64url character, and send the altered token. Require HTTP 401 with the same error-envelope checks. This verifies that a token derived from a real login is rejected after tampering. |

Avoid asserting exact authentication error wording; status, JSON shape, and a nonempty message establish the relevant contract. Do not assert full JWT values, signing algorithm, or expiry duration in these endpoint tests.

## Account lifecycle and configuration

- Delete accounts created by the fixture after each consuming test, including failed tests. Existing signup tests still retain their accounts. Each fixture invocation uses a unique username/email and the existing `example.invalid` email generator. Tests consuming this fixture should not delete the account themselves or change its credentials. Process interruption, unconfirmed signup responses, or failed cleanup can leave accounts behind; no administrator fallback is configured.
- Keep credentials and tokens in memory. Do not log fixture values, attach them to reports, or persist authentication state. Use assertion messages that do not embed passwords or JWTs.
- Run this state-creating spec with zero retries and two workers, consistent with the existing registration command. Set the spec's retries to zero as well so a full CI run cannot retry its account creation implicitly.
- Reuse `API_BASE_URL`. The fixture itself does not use the configured shared login account. Existing configuration still requires `API_LOGIN_USERNAME` and `API_LOGIN_PASSWORD` at startup; removing that requirement is a separate configuration change.
- Fresh accounts are expected to have MFA disabled and client privileges. Fail setup clearly if login does not issue an access token; do not implement MFA or refresh handling in this feature.

## Validation after implementation

Follow `agents.md`: run all newly created tests first; once they pass, run the whole suite for regressions.

```powershell
npm.cmd run typecheck
npx.cmd playwright test tests/api/users/me.spec.ts --project=api --retries=0 --workers=2
npm.cmd test -- --retries=0 --workers=2
git diff --check
```

If the new tests fail, diagnose and fix them, then rerun the new spec before running the full suite. Report any live environment failure separately from implementation failures. Review the report for readable fixture/request/assertion steps and confirm traces are disabled for the new spec.

## Acceptance criteria

- A future spec can import the fixture and obtain generated user details plus a typed, nonempty access JWT without duplicating registration/login code.
- Fixture users are isolated per consuming test; unauthenticated tests do not trigger registration.
- `/users/me` identifies the newly registered user, rather than the shared `.env` account.
- Missing, malformed, and signature-altered tokens return 401.
- Tests use `test.step` and ascending response-code groups.
- Typecheck, the new spec, and the full suite pass, or any environment blocker is explicitly reported.
- No application backend changes, token refresh tests, MFA setup, admin fixture, or existing test migrations are included. Self-deletion in fixture teardown was added as an approved follow-up.
