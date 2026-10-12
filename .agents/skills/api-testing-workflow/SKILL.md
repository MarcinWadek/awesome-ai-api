---
name: api-testing-workflow
description: Explore API behavior, prepare evidence-based test plans, implement Playwright API tests, and review API coverage. Use for endpoint testing and API test maintenance in repositories using Playwright HTTP clients and api-test-plan.md.
---

# API Testing Workflow

Follow the repository's API testing workflow from exploration through verification. Apply the stages relevant to the request: a planning request produces a plan; a review request produces findings and proposed improvements; an implementation request continues through verification and documentation.

## Keep coverage focused

- Default to a small, reliable set of tests for the endpoint's main functionality. Prioritize assertion quality, readable code, deterministic setup and cleanup over test count or exhaustive coverage.
- Start with one representative happy path, one missing-authentication case for protected endpoints, and a main endpoint-specific negative case when relevant, such as lookup `404` or essential input validation. This is a starting scope, not a quota; justify additional cases by a distinct business rule or demonstrated risk.
- Do not automatically add malformed/expired/tampered token variants to every endpoint when shared authentication coverage already exists. Defer secondary boundaries, repeated operations, alternate happy paths and cross-user scenarios unless they are central to the requested behavior or explicitly requested.
- Keep setup proportional to the behavior under test. Use a fresh user's empty cart for a basic cart read; use populated state when necessary to prove clearing actually removes items. Add peer accounts, catalogue dependencies and helpers only when the selected core case needs them.
- Exploration may investigate more cases than automation needs. Record useful findings and deferred cases in the plans without turning every successful probe into a test. Before implementation, remove cases that repeat an existing guarantee or add complexity without materially improving confidence.

## Establish the contract and explore

- Read applicable repository instructions, API documentation or OpenAPI contracts, available backend source, existing tests, clients, fixtures, and test commands.
- Check the single root `api-test-plan.md`. Read existing exploration notes and bug reports when relevant; do not create folder-level test plans.
- Base plans and assertions on evidence. When behavior is unclear, check documentation, explore the application further, or ask the user; do not invent expected behavior, environment details, or coverage counts.
- Explore relevant live endpoints using curl (`curl.exe` in PowerShell) or Playwright's HTTP client. Verify the core happy path, authentication and relevant validation; investigate unusual behavior when evidence or the requested scope warrants it.
- Use isolated data and clean up created accounts and other test resources. Reuse existing lifecycle fixtures when suitable.

## Record findings

- Automatically save durable exploratory reports in `docs/exploration/`, creating the directory and its `README.md` index if missing. Use `YYYY-MM-DD-<scope>.md` with a short lowercase, hyphen-separated endpoint or batch scope, for example `2026-10-04-users-signup.md` or `2026-10-06-users-cart.md`. Use the actual exploration date, not the documentation-edit date.
- Include the environment, operations, contract sources, request conditions, expected versus observed status/body behavior, isolated setup and cleanup results, defects and untested areas. Provide reproducible request details for unusual findings without saving credentials, tokens or unrelated account data. Never invent missing evidence.
- Add each report to the index with its date, scope and relative link; link it from the root API test plan. For the same scope and day, extend the existing report; for a later exploration, create a new dated report and link prior evidence. Preserve historical findings and separate subsequent automation results from live observations.
- Keep raw diagnostics and ad hoc runners in the gitignored `exploration-results/` directory. The Markdown report must remain useful without those temporary artifacts. Exploratory probes do not automatically become permanent regression tests.
- Create separate bug reports with reproducible steps, expected results and their contract basis, and actual results. Link the supporting findings.
- Distinguish documented expectations, observed behavior, and known defects. Do not silently make a defect the desired contract in a passing test.

## Prepare the implementation plan

- Save the implementation plan as a Markdown file in `docs/implementation/`, creating the directory and its `README.md` index if missing. Use a descriptive lowercase, hyphen-separated filename that reflects the actual scope, such as `registered-user-auth-fixture-and-me-tests.md` or `users-list-lookup-and-cart-read-clear-tests.md`; avoid generic names such as `implementation-plan.md`.
- Keep the file proportional to the work: a simple endpoint batch needs only a short scope, selected cases, setup/cleanup, required code changes and validation commands. Link exploration reports and API test plans rather than duplicating their findings or coverage tables. Creating documentation must not expand the test scope.
- Propose the automation scope and test count from exploration and existing coverage, focusing on crucial behavior without duplicating tests.
- Define setup, assertions, cleanup, and required clients or fixtures for each planned case. Identify known defects and deferred coverage.
- Review the scope before implementation. Honor an already agreed scope; when the user requests only planning or review, deliver that artifact before implementing changes.
- Update the single root `api-test-plan.md` with planned coverage and deferred cases. Keep endpoint-specific detail in exploration reports and implementation records instead of folder-level test plans.
- Add the implementation file to `docs/implementation/README.md` with its scope and relative link, and reference it from the root API test plan. Update the same file as the implementation evolves instead of creating duplicate plans for one delivery.

## Implement and verify

- Create one spec per endpoint operation, following repository naming and layout conventions.
- Initialize HTTP clients in test setup, such as `beforeEach` or fixture setup.
- Use Given/When/Then `test.step` labels to make setup, requests, and assertions readable in reports.
- Order test cases by expected response code ascending, for example 200, 201, 204, 400, 401, 404. Include only codes supported by the operation's contract or established findings.
- Keep data isolated and ensure teardown cleans up created resources, including when assertions fail.
- Run all newly created tests first. Diagnose failures and rerun them until they pass; only after they pass, run the whole suite to check for regressions.
- Run the repository's typechecking command and `git diff --check`. Use discovered scripts and configuration rather than assuming commands or environment settings.
- If execution is blocked by the environment, record the blocker and the checks that actually ran. Do not claim unexecuted checks passed.
- Update the root API test plan with implemented coverage, verification results, known bugs, and remaining gaps. Do not mark planned cases implemented before they exist.
- Complete the implementation document with the delivered scope, actual verification results and material limitations. Mark a completed plan as a historical implementation record and link the maintained API test plans so original results are not mistaken for current suite status.

## Review and improve

- Review contract correctness, assertion quality, reliability, setup, cleanup, and documentation consistency.
- Separate defects, formatting cleanup, and optional enhancements in review findings.
- For review-only requests, propose improvements before implementing them. For authorized implementation, apply agreed changes and verify them.
- Run any newly created tests first, then the whole suite after they pass. For changes to existing tests, run affected tests and the whole suite.
- Remove duplicated documentation introduced by the work and update links when files are renamed.

## Report the outcome

Report the implemented scope and number of tests added, actual test and verification results, known bugs, deferred coverage, and limitations. Link relevant plans, exploratory findings, and bug reports. State a next task only if one has been agreed.
