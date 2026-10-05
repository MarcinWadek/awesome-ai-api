# README

## Run the project after cloning

This repository contains Playwright API tests for Awesome AI. It does not
start a local application server: tests call the API configured in `.env`.
The example endpoint is `https://awesome.byst.re`.

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later (the current LTS release is recommended)
- npm (included with Node.js)

### Install and run

From a terminal in the cloned repository, run:

```bash
npm ci
cp .env.example .env
```

In PowerShell, use `Copy-Item .env.example .env` to copy the file. Fill in
`API_LOGIN_USERNAME` and `API_LOGIN_PASSWORD` in `.env` with your test account
credentials, then run:

```bash
npm test
```

`npm ci` installs the exact dependency versions recorded in
`package-lock.json`. The current suite uses Playwright's HTTP client only, so
browser binaries are not required.

To run a single test file, use:

```bash
npx playwright test tests/api/users/signin.spec.ts
```

After a run, open the HTML report with:

```bash
npx playwright show-report
```

To run the API project explicitly:

```bash
npm run test:api
```

The API documentation is included in this project in the `docs/api-docs.json` file.

We test the publicly available website: [https://awesome.byst.re](https://awesome.byst.re).

The backend source code is also publicly available one directory above, in the `test-secure-backend` folder.

Swagger is publicly available as well, so it can be checked when needed: [https://awesome.byst.re/swagger-ui/index.html](https://awesome.byst.re/swagger-ui/index.html).

## Configuration

Set `API_BASE_URL`, `API_LOGIN_USERNAME`, and `API_LOGIN_PASSWORD` in the
repository-root `.env`. Dotenv loads this file before configuration values are
read, including when running from the Playwright IDE extension. Missing or blank
values fail immediately with an error naming the variable.

Existing shell or CI variables take precedence over `.env`. In CI, supply the
credentials through your CI provider's secrets and expose them under the same
environment variable names; a local `.env` file is not required.

Only `.env.example`, with empty credential placeholders, is committed. `.env`
and `.env.*` files are ignored, except `.env.example`. Playwright authentication
state and generated reports/traces are also ignored because they can contain
session tokens or credentials.

This follows Playwright's guidance on
[environment variables and dotenv](https://playwright.dev/docs/test-parameterize#env-files)
and [keeping authentication state out of version control](https://playwright.dev/docs/auth).

## Login endpoint

The suite covers `POST /api/v1/users/signin` with test groups in HTTP-status
order: `200`, `401`, and `422`. It checks JSON and no-store response headers,
stable session-contract fields, and the live deployment's error envelopes. The
endpoint can also be checked with `curl`.

In Bash:

```bash
curl -X POST 'https://awesome.byst.re/api/v1/users/signin' \
  -H 'Content-Type: application/json' \
  --data '{"username":"<username>","password":"<password>"}'
```

In PowerShell, use `curl.exe` with `--%`:

```powershell
curl.exe --% -X POST https://awesome.byst.re/api/v1/users/signin -H "Content-Type: application/json" -d "{\"username\":\"<username>\",\"password\":\"<password>\"}"
```

## Authenticated user fixture

Import `test` and `expect` from `fixtures/auth.fixture.ts` for tests that need a
fresh registered account. The lazy, test-scoped `authenticatedUser` fixture
registers a unique user and signs in, returning `{ user, token }`. `user` contains
the generated registration details, including the password; `token` is the access
JWT. Each consuming test gets its own account. Tests that do not request the
fixture do not register or sign in.

```typescript
import { test, expect } from '../../../fixtures/auth.fixture';
import { UsersClient } from '../../../clients/users.client';

test('gets the registered account', async ({ request, authenticatedUser }) => {
  const response = await test.step('Get the authenticated user', () =>
    new UsersClient(request).getMe(authenticatedUser.token),
  );
  await test.step('Verify the registered identity', async () => {
    expect(response.status()).toBe(200);
    expect((await response.json()).username).toBe(authenticatedUser.user.username);
  });
});
```

`UsersClient.getMe()` omits Authorization when no token is supplied. Supplying a
token adds `Authorization: Bearer <token>` for that request only.

Traces are disabled on the exported fixture test to keep passwords and tokens
out of traces. Do not log or attach fixture values to reports, persist tokens,
or override the trace setting in consuming specs. After each consuming test,
the fixture deletes its generated account and user-owned data through
`DELETE /api/v1/users/{username}/right-to-be-forgotten`, using that user's JWT.
Cleanup runs after the consuming test, including assertion failures, and requires
HTTP 204. There is no retry or fallback if fixture setup fails before yielding
the user and token.
This fixture owns account deletion: consuming tests should not delete the account
themselves or change its credentials. Interrupted processes or an unconfirmed
signup response can leave accounts behind. Existing signup tests still retain
their accounts.
The fixture uses generated credentials, although startup configuration still
requires the shared `.env` login credentials for the existing suite.

The `/users/me` spec covers the registered identity and rejection of missing,
malformed, and signature-altered tokens. Run it with two workers and zero retries:

```powershell
npx.cmd playwright test tests/api/users/me.spec.ts --project=api --retries=0 --workers=2
```

## Registration tests

The basic signup suite has four tests: successful registration and sign-in,
missing required fields, duplicate username, and duplicate email.

```bash
npm run test:registration
npm run typecheck
```

On Windows, use `npm.cmd` if PowerShell blocks the npm script wrapper.
The tests use the existing `.env` configuration, run with two workers and zero
retries. Created accounts remain in the environment; automatic cleanup is
deferred for now. Registration traces are disabled to keep passwords and tokens
out of traces.

Use the Faker generator in `generators/registration.generator.ts`:

```typescript
const user = generateRegistrationData();
const anotherUser = generateRegistrationData({ firstName: 'Anna' });
```

It generates realistic names that meet the API's minimum length, short ASCII
passwords, unique usernames, and safe email addresses under `example.invalid`.
Individual fields can be overridden for test cases. SSO, fixtures, and advanced
boundary coverage are deferred until the framework needs them.

Faker 10 requires Node 20.19+, 22.13+, or 24+ (verified with Node 24.21).
No formatter or linter is currently configured. Use `git diff --check` to check
whitespace. Earlier exploratory findings remain in `docs/signup-exploration.md`.
