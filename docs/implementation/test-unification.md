# Test organization unification

Scope: simplify the existing endpoint specs after fixture unification, retaining
their scenarios, assertions and cleanup guarantees.

- Replace small test.step wrappers with Given/When/Then comments; preserve callback
  evaluation order, returned values and local variable scopes.
- Flatten response-code describes into status-prefixed test names.
- Inject shared clients instead of reconstructing them in beforeEach; keep local
  assertion helpers and scenario-specific setup/cleanup explicit.
- Standardize method-bearing spec filenames and update active references.
- Centralize retry/trace defaults; retain MFA's longer timeout.
- Update current authoring guidance and verify discovery/counts, typechecking,
  offline fixture checks, selected live scenarios, then the full api/admin suite.

This delivery does not add endpoint coverage or redesign resource lifecycles.
Existing registration cleanup and external-provider gaps remain tracked in the
API coverage report.

## Implementation and verification

- Removed 453 small step wrappers and 44 repeated client constructors across all
  57 endpoint specs. Helpers that use injected clients receive them explicitly.
- Compared the structural rewrite with the original specs: assertion and API call
  counts were preserved before consolidating 104 equivalent status/JSON/body checks
  into the existing json helper. Callback return values and variable scopes were
  handled explicitly; no status-specific hook was broadened by flattening groups.
- Renamed eight legacy endpoint spec filenames to include their method and updated
  references, including the registration npm script.
- Kept all 177 endpoint tests (104 api / 73 admin), all cleanup hooks, meaningful
  polling/readback assertions and MFA's 90-second timeout. No new scenarios added.
- Typecheck, the additional noUnusedLocals check and 12/12 offline fixture checks
  passed. Current documentation links passed.
- Representative live run: 51/51 passed, 1.1 min, four workers, zero retries.
- Full api/admin regression: 177/177 passed, 4.3 min, four workers, zero retries.
- Final profile-spec check after the small JWT preparation/comment cleanup:
  4/4 passed, 3.1 seconds, two workers, zero retries. The supplemental run retained
  redaction and used its own output location, preserving the full HTML report.
- Final typecheck with noUnusedLocals, whitespace and current documentation links
  passed. All new conventions are documented in [test conventions](../test-conventions.md).

Completed on 24 October 2026 against the configured awesome/aitesters deployments.
The framework's existing offline fault checks remain separate from REST coverage.
No subagents were used. Diagnostic scripts and logs are gitignored under
exploration-results; no extra runtime or formatter dependency was added.
