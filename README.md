# Awesome AI API

Playwright + TypeScript API automation for Awesome AI: authentication, commerce
and AI chat/tool endpoints. Built as an independent course-based portfolio with
AI-assisted development. The backend and model mock are external systems under test.

## Setup

Use Node.js 24+ and npm 10+. No browser installation or local backend is required.

```bash
npm ci
cp .env.example .env
```

In PowerShell use `Copy-Item .env.example .env`; use `npm.cmd`/`npx.cmd` if script
execution policy blocks npm. Fill `.env` with authorized test-account credentials:

| Project | Default URL | Credential variables |
| --- | --- | --- |
| `api` | `https://awesome.byst.re` | `API_LOGIN_USERNAME`, `API_LOGIN_PASSWORD` |
| `admin` | `https://aitesters.byst.re` | `ADMIN_API_LOGIN_USERNAME`, `ADMIN_API_LOGIN_PASSWORD` |

`API_BASE_URL` / `ADMIN_API_BASE_URL` select URLs; admin authentication enforces
the staging origin. The admin project also includes ordinary staging shoppers.
Absent URL values use defaults; blank values fail. Shell/CI variables override
`.env`; credentials are loaded only when configured-account sign-in is needed.
Discovery needs no credentials. Never commit `.env`, tokens or generated reports.

## Commands

| Task | Command |
| --- | --- |
| Discover without API requests | `npx playwright test --list` |
| Both remote projects | `npm test` |
| API / staging only | `npm run test:api` / `npm run test:admin` |
| One spec | `npm run test:api -- tests/api/users/me.get.spec.ts` |
| AI checks | `npm run test:api -- tests/api/ollama` |
| Offline fixture checks | `npm run test:fixtures` |
| Typecheck / whitespace | `npm run typecheck` / `git diff --check` |
| HTML report | `npx playwright show-report` |

For behavioral changes, run affected tests first, then:

```bash
npm test -- --project=api --project=admin --workers=4 --retries=0
```

Live runs create data. Fixtures clean up most owned resources; signup tests retain
accounts, and interruption can prevent teardown. Retries and traces are disabled.
Keep the redaction reporter first, including reporter overrides; do not log secrets.

## Documentation

- [Visual HTML report](docs/report.html): coverage dashboard, contributor guide and bug reports.
- [Contributor guide](docs/contributor-guide.md): architecture, fixtures, test conventions and workflow.
- [Coverage](api-coverage-report.md): endpoint-to-test matrix, dated results and gaps.
- [Bug reports](docs/bug-reports.md): concise reproduction steps and last-known status.

## History

Detailed explorations, delivery records and the development case study are saved
in the local Git tag `docs-history-2026-10-25`. For example:

```bash
git show docs-history-2026-10-25:docs/development-case-study.md
```
