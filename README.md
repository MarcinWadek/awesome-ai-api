# README

Current endpoint coverage, suite status, missing automation and recommended next
tasks: [API coverage and status report](api-coverage-report.md).

Exploratory evidence: [API exploration reports](docs/exploration/README.md).

Our process: [API testing workflow](docs/api-testing-workflow.md) — exploratory
tests, exploration findings, implementation planning, implementation and
verification, code review/improvement, then a summary.

## Run the project after cloning

This repository contains Playwright API tests for Awesome AI. It does not
start a local application server: tests call two APIs configured in `.env`.
Existing non-admin tests use `https://awesome.byst.re`; admin tests use
`https://aitesters.byst.re`.

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
credentials. Fill in `ADMIN_API_LOGIN_USERNAME` and `ADMIN_API_LOGIN_PASSWORD`
with the course staging admin credentials, then run both projects:

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

The existing suite targets [awesome](https://awesome.byst.re); admin examples
target [aitesters staging](https://aitesters.byst.re).

The backend source code is also publicly available one directory above, in the `test-secure-backend` folder.

Swagger is publicly available as well, so it can be checked when needed: [https://awesome.byst.re/swagger-ui/index.html](https://awesome.byst.re/swagger-ui/index.html).

## Configuration

Set `API_BASE_URL=https://awesome.byst.re`, `API_LOGIN_USERNAME`, and
`API_LOGIN_PASSWORD` for the existing `api` project. Set
`ADMIN_API_BASE_URL=https://aitesters.byst.re`, `ADMIN_API_LOGIN_USERNAME`, and
`ADMIN_API_LOGIN_PASSWORD` for the `admin` project in the repository-root `.env`.
When upgrading an existing checkout, add these admin variables from `.env.example`
without replacing the existing values.

Dotenv loads this file before configuration values are read, including when
running from the Playwright IDE extension. If a URL variable is absent, the project
uses its default: awesome for `api`, aitesters for `admin`. Explicitly blank URL
values fail rather than silently falling back. Credentials are required only
when their environment's sign-in is used. Missing or blank credentials report
the variable name, never its value. Each project can run without variables for
the other environment.

Existing shell or CI variables take precedence over `.env`. In CI, supply the
credentials through your CI provider's secrets and expose them under the same
environment variable names; a local `.env` file is not required.

Only `.env.example`, with empty credential placeholders, is committed. `.env`
and `.env.*` files are ignored, except `.env.example`. Playwright authentication
state and generated reports/traces are also ignored because they can contain
session tokens or credentials.

Project file filters are disjoint: `api` runs `tests/api/**/*.spec.ts`, while
`admin` runs `tests/admin/**/*.spec.ts`. `npm test` runs both; `npm run test:api`
and `npm run test:admin` select one. Both use isolated test-scoped request
contexts and can run together with multiple workers. CI defaults to four workers.

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
registers a unique user and signs in, returning `{ user, token, refreshToken }`.
`user` contains the generated registration details, including the password;
`token` is the access JWT; `refreshToken` is the session's refresh credential.
Each consuming test gets its own account. Tests that do not request the fixture
do not register or sign in.

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
Cleanup covers failures after confirmed registration, including failed login
setup and consuming-test assertions, and requires HTTP 204. When setup did not
obtain an access token, cleanup signs in again; a 401 deletion response triggers
one fresh login and deletion retry. If cleanup also fails, the account username
and both failures are reported.
This fixture owns account deletion: consuming tests should not delete the account
themselves or change its credentials. Interrupted processes or an unconfirmed
signup response can leave accounts behind. Existing signup tests still retain
their accounts.
The fixture uses generated credentials. Shared `.env` login credentials are
read only by tests that explicitly sign in with that configured account.

The lazy `authenticatedPeer` fixture supplies a second independent account for
prompt isolation checks. It uses the same lifecycle and cleanup as
`authenticatedUser`; it is created only when a test requests it.

## Traffic, product and prompt tests

Eight dedicated endpoint specs add 24 core tests: six traffic reads, six product
reads and twelve current-user chat/tool prompt tests. Coverage includes session
pagination, product lookup errors, prompt persistence/isolation, null reset,
oversized-input rejection and missing authentication on protected operations.
Traffic tests target the configured deployment's legacy public access mode.

Run the new batch with:

```powershell
npx.cmd playwright test tests/api/traffic tests/api/products tests/api/users/chat-system-prompt.get.spec.ts tests/api/users/chat-system-prompt.put.spec.ts tests/api/users/tool-system-prompt.get.spec.ts tests/api/users/tool-system-prompt.put.spec.ts --project=api --retries=0 --workers=2
```

Run `npm.cmd run typecheck` and the full API suite after the new tests pass.
See [the API coverage report](api-coverage-report.md) and
[exploratory findings](docs/exploration/2026-10-06-traffic-products-prompts.md) for remaining input
boundaries and the two known prompt parsing/type defects. Those defects are
documented without skipped test placeholders.

The `/users/me` spec covers the registered identity and rejection of missing,
malformed, and signature-altered tokens. Run it with two workers and zero retries:

```powershell
npx.cmd playwright test tests/api/users/me.spec.ts --project=api --retries=0 --workers=2
```

## Ollama tests

Four endpoint specs cover tool definitions and generate/chat/tool SSE responses:
11 API tests for authenticated success, essential validation, and missing JWTs.
They reuse `authenticatedUser` through `fixtures/ollama.fixture.ts`, which
initializes `OllamaClient` in fixture setup. Inputs and expected mock prose live
in `support/ollama-test-data.ts`. Specs keep Given/When/Then steps visible:
[Ollama helpers](support/ollama.helpers.ts) collect streams and prepare catalogue
context, while [answer assertions](support/assertions/ollama.ts) and
[product-tool assertions](support/assertions/ollama-tools.ts) validate the details.
The shared SSE reader handles multiline events and preserves text fragments.

```powershell
npm.cmd run test:api -- tests/api/ollama --workers=2 --retries=0
```

Known prompts and exact prose are tied to the deterministic mock scenarios.
Tests check thinking-before-content for the selected generate/chat scenarios,
assistant roles for tool calls and one completion marker per model phase.
The tool test consumes the entire body and checks exact final prose separately
from product data. It validates product identity against catalogue reads and
the types of price/stock fields. Exact mutable price, stock and availability
comparisons require isolated catalogue data and are deferred. Playwright buffers
responses; these tests do not establish token latency.

See [Ollama exploration](docs/exploration/2026-10-11-ollama.md),
[implementation record](docs/implementation/ollama-streaming-tests.md), and the
[mock grounding limitation](docs/ollama-mock-bug-report.md).

## Admin tests and disposable products

Six staging examples cover usable admin authentication, product creation,
partial update, deletion, and two creation authorization checks (401/403).
Admin sign-in is test-scoped and validates the admin role and usable token. The fixture
rejects routing outside aitesters. No worker token cache or saved auth state is
used, and cleanup never logs out, deletes, resets or edits the shared admin.

Import `test` and `expect` from `fixtures/admin.fixture.ts`. The
`authenticatedAdmin` fixture supplies `{ token }`; create `ProductsClient` in
`beforeEach` and call its methods directly in tests. There is no product fixture,
product registry or authentication retry helper.

Product specs prepare valid data with a fresh UUID name in `beforeEach`.
Their `afterEach` reads the staging catalogue and deletes only products with
that exact name, accepting 204/404. This handles assertion failures, lost creation
replies and unexpected creation in authorization tests without caching IDs across
runs. These examples keep the unique name unchanged when updating price/stock.
If a future test changes the name, its cleanup must identify that test's new name.
Traces are disabled, and clients use `safeRequest` for the final transport error.
Playwright records automatic API-step errors before the client catches them;
`support/redact-errors.reporter.ts` removes those request details before the
list/HTML reporters receive them. Specs and fixtures need no wrappers.
Keep the redaction reporter first. A CLI `--reporter` override replaces the
configured reporter list and must include redaction when running real requests.
Do not log/attach tokens or credentials, enable request debug logging, or override
admin trace settings.

Staging resets daily, so tests create their data on every run. Process termination
can prevent teardown; a reset during execution can interrupt tests. Future cart
or order scenarios using these products must also create users and carts on
aitesters and remove those references before product cleanup. Existing awesome
users/carts must never receive staging product IDs or tokens.

```powershell
npm.cmd run test:admin -- --workers=4 --retries=0
npm.cmd test -- --project=api --project=admin --workers=4 --retries=0
```

See [admin exploration](docs/exploration/2026-10-12-admin-products.md) and the
[delivery record](docs/implementation/admin-environments-and-disposable-products.md).
Current commerce, user CRUD and inventory coverage is listed in the
[API coverage and status report](api-coverage-report.md); this section describes
the original admin/product examples.

## MFA tests

Six endpoint specs add 16 tests for enrollment, two-factor login, recovery-code
replacement and disable. They use disposable accounts, direct TOTP generation,
bounded waits for fresh time steps and independently verified cleanup. Existing
authentication fixtures and shared admin MFA are unchanged.

```powershell
npx.cmd playwright test tests/api/users/2fa tests/api/users/signin.2fa --project=api --workers=2 --retries=0
```

See [MFA exploration](docs/exploration/2026-10-23-mfa.md), the
[implementation record](docs/implementation/mfa-lifecycle-tests.md), and the
[coverage report](api-coverage-report.md) for actual results and deferred cases.

## Refresh and logout tests

The dedicated specs cover refresh-token rotation, usable access tokens, invalid
input and token reuse, plus logout revocation across all of a user's sessions
and unauthorized logout requests. They use isolated fixture accounts with
automatic cleanup, disabled traces, zero retries, and ascending status groups.

```powershell
npx.cmd playwright test tests/api/users/refresh.spec.ts tests/api/users/logout.spec.ts --project=api --retries=0 --workers=2
```

The live deployment's replay behavior differs from the local backend's token
family revocation logic; details are recorded in `api-coverage-report.md`.

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
whitespace. Earlier exploratory findings remain in `docs/exploration/2026-10-04-users-signup.md`.
