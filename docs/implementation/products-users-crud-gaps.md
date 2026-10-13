# Product and user CRUD gaps

Status: completed historical implementation record, 13 October 2026.
Maintained coverage: [root plan](../../api-test-plan.md).
Contract and live evidence: [13 October exploration](../exploration/2026-10-13-products-users-crud.md).

Delivered 17 cases, reusing existing product happy paths and POST 401/403:
product POST 400; PUT 400/401/403/404; DELETE 401/403/404; user PUT owner/admin
200 and 400/401/403; user DELETE 204/401/403/404. All new tests run in the staging
admin project so resources and tokens share an environment.

UsersClient now has typed update/delete methods. Clients initialize in setup.
Product specs retain unique-name cleanup and use deleted owned IDs for absent
products. Rejected mutations are checked for target preservation. User PUT reuses registered
client/peer fixtures and validates response plus persisted profile. User DELETE
uses local disposable registration and admin cleanup that accepts already-absent
users, including after assertion failure or partial setup. Never delete shared data.
All specs use Given/When/Then steps and ascending status order.

## Verification

- Before changes, the network-enabled baseline passed 76/76 in 50.4s. The initial
  sandboxed run failed before live responses due to blocked network connections;
  the authorized network-enabled rerun resolved that environment restriction.
- The 17 new tests passed first: 17/17 in 22.4s on staging, four workers, zero retries.
  Selection used the new test titles via `--grep`, excluding the reused examples.
- After that pass, `npm.cmd test -- --project=api --project=admin --workers=4 --retries=0`
  passed 93/93 in 1.2m, including all affected product/user specs and existing cases.
  Projects contain 70 api tests on awesome and 23 admin tests on staging.
- `npm.cmd run typecheck` and `git diff --check` passed.
- All teardown checks passed. Local user DELETE cleanup handles 204 and 404 and
  confirms absence; user PUT uses existing owner-forget fixture cleanup. Product
  teardown removes only exact per-test UUID-name matches, including after failures.

No defects or unresolved cases in the requested scope. Missing-user PUT,
dedicated right-to-be-forgotten coverage, additional validation boundaries and
commerce-linked deletion remain outside this delivery. No backend code was changed.
Original results here are historical; the root plan maintains current suite status.
