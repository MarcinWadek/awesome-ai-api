# Product and user CRUD gaps

Explored on 13 October 2026 against `https://aitesters.byst.re`. Prior evidence:
[admin/products](2026-10-12-admin-products.md). Sources inspected read-only in
`../test-secure-backend/src/main/java/com/awesome/testing/`: ProductController,
UserEditController, UserDeleteController, ProductCreateDto, ProductUpdateDto,
UserEditDto, ProductService, UserService, UserEntity, WebSecurityConfig and global,
product and user exception handlers. Live staging `/v3/api-docs` declares all
requested response codes. Local source is supporting evidence; deployed revision
was not established.

## Live results

All requests used one staging context, a verified ROLE_ADMIN login and two freshly
registered UUID-named clients. Products had a unique marker, description, price
12.34, stock 7, category and null image URL. Valid product updates used price 23.45.

| Operation / condition | Expected and observed |
| --- | --- |
| Product POST with otherwise valid data and price -1, admin | 400 JSON; `price: Price must be greater than 0` |
| Product PUT existing owned ID, price -1, admin | 400; same field error |
| Product PUT existing owned ID, valid update, no auth / client | 401 `Unauthorized` / 403 `Access denied`, JSON |
| Product DELETE existing owned ID, no auth / client | 401 / 403, JSON messages as above |
| Product PUT deleted owned ID, valid update, admin | 404 JSON `Product not found` |
| Product DELETE deleted owned ID, admin | 404, empty body |
| User PUT own username, valid email and names, owner | 200 JSON; updated fields returned |
| User PUT disposable client's username, valid email and names, admin | 200 JSON; updated fields returned and verified by owner GET |
| User PUT existing own username, email `invalid`, otherwise valid data | 400 JSON `email: Email should be valid` |
| User PUT existing username, valid data, no auth / peer client | 401 / 403, JSON messages as above |
| User DELETE existing disposable username, no auth / owner client | 401 / 403; even owner requires admin |
| User DELETE disposable username, admin | 204, empty body; admin GET then returned 404 |
| User DELETE already deleted disposable username, admin | 404 JSON `The user doesn't exist` |

Product price remained 12.34 after rejected PUTs. User PUT returns additional
entity fields while GET returns the profile DTO; neither exposed `password`.
Assertions should validate identity, role, editable fields and credential omission
without requiring identical response keys. User edit requires a valid nonblank
email; optional names must be 4–255 characters when provided.

## Cleanup and limitations

Admin deletion removed the owned product; final catalogue lookup found no matching
marker. User cleanup returned 404 for the already-deleted target and 204 for the
peer. Context was disposed; shared admin was not mutated or logged out. No tokens,
passwords or unrelated account bodies were saved. Probe runner is ignored at
`exploration-results/crud-probe.cjs`.

No API defects were observed in the requested scope. Missing-user PUT, dedicated
right-to-be-forgotten tests and additional validation boundaries were not probed.
Initial sandbox baseline failed before API responses; network-enabled rerun passed
76/76 in 50.4s (four workers, zero retries, both api/admin projects).

## Subsequent automation

The [implementation record](../implementation/products-users-crud-gaps.md) delivers
17 tests for all requested gaps. New cases passed 17/17 (22.4s), followed by the
full api/admin suite passing 93/93 (1.2m); both used four workers and zero retries.
Typechecking and `git diff --check` passed. These are automation results after
the live observations above; no requested defect remains unresolved.
