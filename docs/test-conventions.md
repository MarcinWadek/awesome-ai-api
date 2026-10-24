# Test conventions

Endpoint specs use one describe named `METHOD /path`, with flat `status: behavior`
test names ordered by response code. Files include the HTTP method, for example
`users/signin.post.spec.ts` and `users/me.get.spec.ts`. Keep related operations
in the existing resource folders. The api/admin projects select deployment
environments; ordinary staging shoppers also appear in the admin project.
Offline fixture checks remain under tests/fixtures with their own configuration.

## Arrange, act and assert

Use `// Given`, `// When`, `// Then` comments to separate preparation, the request
under test and verification. Omit empty sections. A longer workflow can repeat
When/Then when each transition matters. Fixture-provided state need not be
repeated as artificial Given code. Keep domain assertion helpers and meaningful
polling/readback checks; use `json<T>(response, status)` for matching JSON response
checks. It verifies status and content type before returning the body.

Small test.step wrappers are unnecessary in specs. Reserve named report steps
for a longer workflow that benefits from them. Fixture lifecycle steps remain
useful for distinguishing setup and cleanup failures.

## Clients, data and cleanup

Import test/expect from the narrowest applicable fixture entry point:
clients for anonymous/configured-account checks, auth for disposable ordinary
accounts, admin for staging administration, and MFA/lifecycle/commerce for their
specialized resources. Clients are injected through callback parameters;
constructors live in fixtures/clients.fixture.ts. Local helpers that operate on
clients take them explicitly as parameters.
Use descriptive fixture names: keep `commerce` instead of shortening it to `c`.

Keep scenario-specific data in the test or its setup hook. Existing cart/product
hooks retain ownership and deletion ordering; commerce retains its fixture-managed
resource lifecycle. This organization pass does not change signup retention or
add another cleanup abstraction. Those gaps remain in the coverage report.

## Execution defaults

playwright.config.ts sets zero retries and disables traces for both environments.
The redaction reporter remains first. MFA specs keep their explicit 90-second
timeout for fresh TOTP windows. Avoid repeating suite-wide defaults in every file.

After a change, run affected live scenarios, the full api/admin suite,
`npm run test:fixtures`, typechecking and whitespace checks. Count endpoint tests
separately from offline framework checks. Current coverage/results live in
[the API coverage report](../api-coverage-report.md).
