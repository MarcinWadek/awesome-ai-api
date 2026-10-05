# API testing workflow

## 1. Start with exploratory tests

Check the contract, backend source and current test coverage, then explore the
live endpoints. Verify happy paths, authentication, validation and unusual
behavior. Use isolated data and clean up created accounts. Do not assume behavior;
check documentation, explore further or ask when unclear.

## 2. Record exploration and prepare the implementation plan

Save concise exploration findings and separate bug reports with reproduction
steps, expected results and actual results. Then propose the automation scope,
test count, setup, assertions and required clients/fixtures. Review the scope
before implementation and focus on crucial behavior. Keep the root and folder
API test plans current; distinguish known bugs from desired behavior.

## 3. Implement and verify

Create one spec per endpoint operation. Initialize HTTP clients in setup, use
Given/When/Then `test.step` labels and order cases by response code ascending.
Run newly created tests first. Once they pass, run the whole suite, typechecking
and whitespace checks. Record coverage, results and deferred cases in the plans.

## 4. Review and improve

Review correctness, assertions, reliability, cleanup and documentation. Separate
defects, formatting cleanup and optional enhancements. Propose improvements
before implementing them when the request is for review only; apply the agreed
changes and verify them. Run any new tests first, then the whole suite.

Keep plans focused on current coverage and next work, exploration documents on
dated observations, and bug reports on reproduction. Remove duplicated detail
and update links when files are renamed.
