---
name: api-testing-workflow
description: Explore, plan, implement and review Playwright HTTP tests in this repository.
---

# API testing workflow

Use [the contributor guide](../../../docs/contributor-guide.md) for architecture,
fixtures, test style and cleanup; [the README](../../../README.md) for commands.
The root [coverage report](../../../api-coverage-report.md) owns the operation
matrix, gaps and dated verification. [Bug reports](../../../docs/bug-reports.md)
own reproduction steps and last-known defect status.

## Scope and evidence

- Read the saved OpenAPI contract, existing specs and applicable instructions.
  Confirm unclear behavior on the target; local backend source is supporting
  evidence, not proof of deployment state.
- Explore with isolated data and cleanup. Automate a small set of distinct risks;
  do not turn every successful probe or token variant into a regression test.
- Plan nontrivial changes briefly in the task conversation before implementation.
  Honor agreed scope; a planning/review request does not authorize implementation.
- Keep raw runners/results in ignored `exploration-results/`. Put durable
  conclusions in coverage or Bug reports. Do not create extra Markdown plans,
  delivery logs, indexes or an archive unless the user explicitly requests them.

## Delivery

- Reuse injected clients and the narrowest owning fixture. Keep scenario setup
  visible, resources test-scoped and cleanup valid after setup/assertion failures.
- Follow the contributor guide's endpoint naming, status ordering and
  Given/When/Then conventions. Keep credentials out of logs, reports and traces.
- Run new/affected tests first, then the full api/admin suite for behavioral
  changes; run appropriate offline fixture checks, typecheck and whitespace checks.
  Documentation-only edits need link/content checks, not live API mutations.
- Preserve intended assertions when a defect is found. Report environment
  blockers separately; do not claim unexecuted checks or a fix without evidence.
- Update only the four maintained documents when their facts change. Keep the
  final response short: change, verification and material remaining gaps.
