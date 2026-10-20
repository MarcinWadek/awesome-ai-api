# Traffic detail tests

Status: delivered implementation record, 20 October 2026; live success remains
blocked by a backend defect.
Evidence: [traffic exploration](../exploration/2026-10-20-traffic-details.md).
Maintained coverage: [root plan](../../api-test-plan.md).

Implemented two cases in `tests/api/traffic/logs-correlation-id.get.spec.ts`, ordered
200/404. Initialized TrafficClient in `beforeEach` and added a URL-encoded detail
method with the existing optional session-header convention.

For 200, generate a unique `api_<UUID>` session, capture an anonymous info request,
and find its correlation ID in the session-scoped list. Use a 5-second bounded
poll; select only matching session/method/path/status. Assert detail identity,
metadata, captured session header, JSON content type, and the owned info response
body against the controlled response. Model only the detail fields in use; never
assert or attach shared traffic bodies. For 404, generate a fresh UUID and session
and assert status plus an empty body. No user fixture is necessary in verified
legacy public mode; traces are disabled and captures have no sensitive content.

The [known detail defect](../traffic-detail-bug-report.md) leaves the 200 test
failing visibly, without weakening assertions, skips or expected-failure annotations.

## Current verification

First run:

```powershell
npm.cmd test -- tests/api/qr/create.post.spec.ts tests/api/traffic/logs-correlation-id.get.spec.ts --project=api --workers=2 --retries=0
```

Result: **4 passed, 1 failed**, 3.6s. Traffic's unknown-ID 404 passed. The 200
test successfully created and discovered its own capture, then failed with
`Expected: 200, Received: 500`. The subsequent detail body/header assertions
could not execute against a successful response. All three QR tests and their
fixture teardown passed. The full api/admin suite was **not run**: the requested
new-tests-pass gate is blocked by this application defect. There is no current
full-suite result for this delivery.

`npm.cmd run typecheck` passed. Repository-wide `git diff --check` failed only on
pre-existing `agents.md` trailing whitespace at lines 7 and 8 (left untouched).
Scope-only tracked diff and all new QR/traffic file whitespace checks passed.
Rerun the focused command and full regression after a backend fix, followed by
typecheck and whitespace checks. These are delivery results; the root plan
maintains subsequent status.

Owned captures expire under server retention; no traffic deletion API exists.
Secured-mode authentication and additional session/validation variants remain
deferred. No staging/cart clients, authentication fixtures or configuration were
changed for this scope.
