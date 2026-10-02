# README

## Run the project after cloning

This repository contains Playwright API tests for Awesome AI. It does not
start a local application server: tests call the public API at
`https://awesome.byst.re` by default.

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later (the current LTS release is recommended)
- npm (included with Node.js)

### Install and run

From a terminal in the cloned repository, run:

```bash
npm ci
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

The defaults use the supplied sign-in account. Override the endpoint or account
for an approved environment with `API_BASE_URL`, `API_LOGIN_USERNAME`, and
`API_LOGIN_PASSWORD`; copy `.env.example` as a starting point. Environment
variables must be loaded by your shell or CI system.

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
