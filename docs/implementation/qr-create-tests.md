# QR creation tests

Status: delivered implementation record, 20 October 2026; combined verification
is blocked by the traffic application defect.
Evidence: [QR exploration](../exploration/2026-10-20-qr-create.md).
Maintained coverage: [coverage report](../../api-coverage-report.md).

Implemented three cases in `tests/api/qr/create.post.spec.ts`, ordered 200/400/401:
valid text returns a PNG (signature, IHDR dimensions and terminal IEND), blank
text returns a nonempty JSON `text` validation error, and missing authentication
returns a nonempty JSON `message` error. Use the existing disposable authenticated
user fixture for the first two cases, with its existing deletion teardown.

Added a small typed QR client initialized in `beforeEach`, using
`Accept: image/png, application/json` and existing safe-request protection. Keep
Given/When/Then steps, disable traces via the existing fixture, and avoid new
dependencies or shared fixture/configuration edits. The incompatible-Accept
[defect](../qr-accept-bug-report.md) remains documented outside core automation.

## Current verification

First run:

```powershell
npm.cmd test -- tests/api/qr/create.post.spec.ts tests/api/traffic/logs-correlation-id.get.spec.ts --project=api --workers=2 --retries=0
```

Result: 4 passed, 1 failed in 3.6s; **all three QR cases passed**, including
disposable-user teardown. The traffic 200 case failed with the documented 500.
The full api/admin suite was **not run**, because the requested focused-pass gate
was not met; no historical baseline is claimed as current verification.
`npm.cmd run typecheck` passed. Repository-wide `git diff --check` failed only on
pre-existing `agents.md` trailing whitespace at lines 7 and 8 (left untouched).
Scope-only tracked diff and all new QR/traffic file whitespace checks passed.

No backend/configuration/dependency/auth-fixture changes were made. These results
describe this delivery, not a future suite state. After the traffic backend fix,
rerun the focused command, the full suite, typecheck and whitespace checks.
PNG payload decoding, full image decompression/CRC validation, text limits,
rate limits and an automated incompatible-Accept case remain deferred.
