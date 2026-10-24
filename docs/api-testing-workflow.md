# API testing workflow

## 1. Start with exploratory tests

- Check the contract, backend source and current test coverage.
- Explore live endpoints using curl (`curl.exe` in PowerShell) or Playwright's HTTP client.
- Verify happy paths, authentication, validation and unusual behavior.
- Use isolated data and clean up created accounts.
- Check documentation, explore further or ask when behavior is unclear.

## 2. Record exploration

- Save reports in [docs/exploration](exploration/README.md), named `YYYY-MM-DD-<scope>.md`, using the actual exploration date and a short endpoint or batch scope.
- Record environment, operations, contract sources, request conditions, expected versus observed results, setup/cleanup, defects and untested areas. Include reproducible details without credentials or tokens.
- Add the report to the exploration index and link it from the API coverage and status report. Extend the same day's report for the same scope; create a new dated report for later exploration and link previous evidence.
- Keep raw diagnostics and ad hoc runners in gitignored `exploration-results/`; the report is the durable evidence. Select only core cases for automation.
- Create separate bug reports with reproduction steps, expected results and actual results.
- Distinguish known bugs from desired behavior.

## 3. Prepare the implementation plan

- Propose the automation scope and test count, focusing on crucial behavior.
- Define setup, assertions and required clients/fixtures using the exploratory findings.
- Review the scope before implementation.
- Update the single root `api-coverage-report.md` with planned coverage and deferred cases. Do not create folder-level test plans.

## 4. Implement and verify

- Create one method-bearing spec per endpoint operation.
- Inject HTTP clients from the shared client/scenario fixtures.
- Use Given/When/Then comments and flat `status: behavior` test names.
- Order cases by response code ascending; omit empty Given/When/Then sections.
- Follow [test conventions](test-conventions.md); keep fixture lifecycle steps and justified workflow-specific report groups.
- Run newly created tests first; once they pass, run the whole suite.
- Run typechecking and whitespace checks.
- Update the API coverage and status report with implemented coverage, results and remaining gaps.

## 5. Review and improve

- Review correctness, assertions, reliability, cleanup and documentation.
- Separate defects, formatting cleanup and optional enhancements.
- Propose improvements before implementing them when the request is for review only.
- Apply agreed changes and verify them.
- Run any new tests first, then the whole suite.
- Remove duplicated documentation and update links when files are renamed.

## 6. Summarize

- Report what was implemented and how many tests were added.
- Report test results and other verification outcomes.
- List known bugs, deferred coverage and remaining limitations.
- Link to the relevant plans, findings and bug reports.
- State the next task, if one has been agreed.
