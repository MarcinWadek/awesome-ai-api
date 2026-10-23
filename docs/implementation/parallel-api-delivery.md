# Parallel API delivery planning record

Documentation update completed on **7 October 2026**. This record describes the
planning delivery; its future-work statements below are historical. Current
coverage, blockers and next actions live in the
[API coverage and status report](../../api-coverage-report.md), which replaced
both root test plans on 23 October 2026. Evidence and repository
revisions are in the [source review](../exploration/2026-10-07-parallel-delivery.md).

## Delivered scope

- Retain completed coverage, endpoint inventory, difficulty scale, known defects
  and historical validation. Reconcile helper inventory and conditional traffic auth.
- Define W0–W9 with goals, operations, prerequisites, parallel starts, blocking
  dependencies, risks, first cases, client/fixture additions and validation commands.
- Add Mermaid dependency map, contributor handoffs, iteration-based delivery and
  concrete next parallel actions. Distinguish development concurrency from test
  isolation and environment-dependent execution.
- Link existing users/products/cart/traffic folder plans to their shared gates and
  record remaining admin/data/mail/stream/cleanup verification items.
- Expose additional saved-contract inventory/MFA/SSO gaps without silently treating
  them as completed or expanding this documentation task into implementation.

## Verification

- Existing API suite: **59/59 passed in 40.1s** against `https://awesome.byst.re`,
  `npm.cmd run test:api -- --workers=2 --retries=0`, after explicit authorization
  for network-enabled execution. Initial sandbox connection failures are preserved
  in the source review as environment failures, not regressions.
- `npm.cmd run typecheck`: passed.
- Markdown checks: passed across 9 changed/new files, 48 local links, all 10
  workstream field sets and all 41 original completed table rows.
- `git diff --check`: passed.
- New tests: **0**. No clients, fixtures, backend or mock code changed. No Maven
  suites were required for this documentation-only delivery.

Current coverage is maintained in the single API coverage and status report. Future batches
should create a focused implementation record, verify their new tests first,
then run the full suite and update the relevant plans with actual results.

## Simplification requested on 7 October 2026

Replaced the long working document with the user's example structure: baseline,
non-admin/admin threads, blockers, shared decisions, delivery order, test rules,
backend facts and a small dependency map. Shortened the four folder handoffs.
The prior detailed plan and its completed statuses/validation history are archived.
QR remains unstarted because this repository has no QR specs. Historical checks
above describe the earlier delivery; this documentation edit adds no tests.

Simplification checks passed: 50 local links/anchors, 41 original Done rows
preserved in history, Markdown fences and `git diff --check`. The working plan is
146 lines. The earlier 59/59 suite result is retained; it was not rerun for this edit.

## Consolidation on 7 October 2026

Following the updated repository rule, removed the four folder-level test plans
and redirected their incoming links to the then-current root plan. Test folders and specs
remain in place. The earlier folder handoffs above describe historical deliveries;
maintain only the coverage report going forward.
