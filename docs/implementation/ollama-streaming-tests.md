# Ollama streaming API tests

Completed **11 October 2026**. Historical implementation record. Evidence:
[live exploration](../exploration/2026-10-11-ollama.md).
Maintained coverage: [root API plan](../../api-test-plan.md).

## Selected scope

- Four operation specs, **11 API tests**: definitions 200/401; generate,
  chat and chat/tools each 200/400/401, ordered by response code.
- Generate/chat happy paths verify known mock text and thinking reconstruction,
  message shapes, multiple fragments, model/timestamp types and final completion.
- Tools happy path verifies both calls and results, continues past intermediate
  done events, compares tool results with current read-only catalogue data, and
  verifies final assistant completion. Do not encode canned product prose as
  authoritative data; [known defect](../ollama-mock-bug-report.md).
- Reuse authenticatedUser lifecycle; initialize OllamaClient in fixture setup.
  Fetch definitions/catalogue only in the tool happy-path setup. No new admin,
  product mutation or account-lifecycle changes.
- Add typed DTOs, known scenario constants, buffered SSE JSON parser and shared
  assertions used by the endpoint tests. Standalone parser tests were removed
  at the user's request; the parser is an internal implementation of readSseJson.
- Buffering is intentional: no timing assertions or proof of incremental flush.
  Real-model, upstream error, 404, rate-limit and system-prompt tests are deferred.

## Verification

- Existing baseline: **59/59 passed**, 40.3s.
- Original delivery, before removing standalone parser tests: **15/15 passed**,
  15.5s; full suite **74/74 passed**, 56.2s. These are historical results.
- `npm.cmd run typecheck`: passed. `git diff --check`: passed.
- All live runs used `https://awesome.byst.re`, two workers, zero retries and
  network-enabled execution after sandbox exploration failed with EACCES.
  Exploration account cleanup and all new authenticated fixture teardowns passed.
  Existing signup specs retain their previously documented account-cleanup gap.

```powershell
npm.cmd run test:api -- --workers=2 --retries=0
npm.cmd run test:api -- tests/api/ollama --workers=2 --retries=0
npm.cmd run test:api -- --workers=2 --retries=0
npm.cmd run typecheck
git diff --check
```

Raw console evidence is in gitignored `exploration-results/ollama-baseline.log`,
`ollama-new-tests.log` and `ollama-full-suite.log`. PowerShell reported native
stderr color warnings on the first two wrappers despite Playwright's passing
summaries; the full-suite wrapper explicitly preserved the npm exit code (**0**).

Delivered files: OllamaClient, fixture/scenario inputs, typed DTOs, buffered SSE
parser, shared stream assertions and four endpoint specs. Every new
test uses test.step; HTTP clients are initialized in fixture/beforeEach setup.
Documentation includes exploration, the mock grounding issue and root coverage.

Remaining limitations: exact generate/chat text requires this mock scenario set;
the tool scenario requires catalogue product 1 with stable identity. Following
review, mutable price/stock/timestamp and availability-total comparisons across
requests are deferred until a controlled dataset is available. No backend/mock
changes, timing tests or 404 placeholders.

## Removal of standalone parser tests

On **11 October 2026**, removed the four standalone SSE parser tests and their
run commands/current coverage descriptions at the user's request. The remaining
suite contains **70 API tests**, including **11 Ollama tests**. The shared SSE
reader remains necessary for generation/chat/tool endpoint assertions; its
parser function is no longer exported.

Verification after removal, `https://awesome.byst.re`, two workers, zero retries:

- Remaining Ollama batch: **11/11 passed**, 16.6s.
- Full remaining suite, after the Ollama batch passed: **70/70 passed**, 57.7s.
- Typecheck, `git diff --check` and local Markdown link checks: passed.
- Raw evidence: gitignored `exploration-results/ollama-after-sse-removal.log`
  and `full-suite-after-sse-removal.log`; both npm exit codes were **0**.

## Review follow-up

Review and implementation authorized on **11 October 2026**. Scope:

- Move scenario requests and expected mock prose into support/ollama-test-data.ts.
- Require one completion per model phase, assistant roles for tool calls, exact
  final mock text, and thinking-before-content for the selected known scenarios.
- Check catalogue product identity/category and tool payload structure. Do not
  compare price, stock, timestamps or in-stock totals from different requests;
  exact mutable-data equality requires a controlled dataset and remains deferred.
- Cover registered-user setup with cleanup, recover a cleanup JWT when login
  setup fails, and preserve both primary and cleanup failures.
- Initially add three local authentication-fixture failure-path tests, later
  removed at the user's request (see below). No SSE unit tests.
- Validate local replays and affected Ollama/fixture tests, then the full suite,
  typecheck and documentation checks. Verification completed.

Delivered review changes:

- Scenario inputs and expected prose moved out of the client fixture. Test count
  remains 11 for Ollama; no standalone SSE tests were restored.
- Each tool model phase now ends exactly once; final assistant text is checked
  against the known mock string solely as a transport guarantee.
- Tool-call messages require role=assistant. Thinking/content ordering is checked
  only for the two selected mock scenarios, not imposed on arbitrary models.
- Catalogue checks retain id/name/category correspondence, uniqueness, pagination
  consistency and product payload validation. Numeric mutable values are not
  compared with an earlier request. Product 1 remains a verified seed dependency;
  catalogue identity changes/deletion are still outside this fixture's control.
- Cleanup runs after confirmed registration even when login setup fails. It
  retains a valid access token when refresh validation fails, reacquires a token
  if necessary, and retries deletion once on 401. Combined failures are reported
  with the generated username, without logging passwords or tokens.

Historical review verification, before removing the additional fixture tests:

- Three new authentication-fixture lifecycle tests: **3/3 passed**, 986ms.
- Updated Ollama tests: **11/11 passed**, 16.3s.
- Eleven local replays of recorded streams: all three controls accepted; all
  seven invalid variants rejected; concurrent stock-change variant accepted.
- Full suite after the new/affected tests passed: **73/73 passed**, 54.6s, two
  workers, zero retries, `https://awesome.byst.re`.
- Typecheck, staged/unstaged `git diff --check`, changed-file whitespace and local
  Markdown link checks: passed.

Replay evidence: gitignored `exploration-results/ollama-review-after-fixes.log`.
Run evidence: `auth-fixture-review-tests.log`, `ollama-review-api-tests.log` and
`ollama-review-full-suite.log` in the same ignored directory; npm exit codes **0**.
A persistently unavailable login service can still prevent
cleanup, but the account and both failures are now reported.

## Removal of additional auth-fixture tests

On **11 October 2026**, removed the three additional auth-fixture tests at the
user's request and made the fixture lifecycle helper private again. The cleanup
improvement remains. The suite contains **70 API tests**, including **11 Ollama
tests**.

Verification after removal:

- Full suite: **70/70 passed**, 56.9s, two workers, zero retries,
  `https://awesome.byst.re`.
- Typecheck and staged/unstaged `git diff --check`: passed.
- Raw evidence: gitignored `exploration-results/full-suite-after-auth-test-removal.log`;
  npm exit code **0**.
