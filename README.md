# README

## Run the project after cloning

This repository contains Playwright end-to-end tests for the Awesome AI API
website. It does not start a local application server: the tests run against
the public site at `https://awesome.byst.re`.

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later (the current LTS release is recommended)
- npm (included with Node.js)

### Install and run

From a terminal in the cloned repository, run:

```bash
npm ci
npx playwright install
npx playwright test
```

`npm ci` installs the exact dependency versions recorded in
`package-lock.json`. `npx playwright install` downloads the browser binaries
used by the tests; it is normally needed only once per machine or after a
Playwright upgrade.

To run a single test file, use:

```bash
npx playwright test tests/example.spec.ts
```

After a run, open the HTML report with:

```bash
npx playwright show-report
```

The default configuration runs the test suite in Chromium, Firefox, and
WebKit. To run only one browser, for example Chromium:

```bash
npx playwright test --project=chromium
```

The API documentation is included in this project in the `docs/api-docs.json` file.

We test the publicly available website: [https://awesome.byst.re](https://awesome.byst.re).

The backend source code is also publicly available one directory above, in the `test-secure-backend` folder.

Swagger is publicly available as well, so it can be checked when needed: [https://awesome.byst.re/swagger-ui/index.html](https://awesome.byst.re/swagger-ui/index.html).

The login endpoint can be checked with `curl`.

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
