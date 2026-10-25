# Bug reports

Recorded on `https://awesome.byst.re`; dates describe observations, not a current
retest. Use disposable accounts and clean up after reproduction. The
[saved contract](api-docs.json) and linked specs provide context; full historical
evidence is preserved in the [history tag](../README.md#history).

## BUG-001: final mock answer disagrees with tool data

**Observed:** 11 October 2026. **Status:** mock limitation; fix unconfirmed.

**Reproduce:** sign in, fetch `/api/v1/ollama/chat/tools/definitions`, then POST
`/api/v1/ollama/chat/tools` with those tools, model `qwen3.5:2b`, `stream: true`
and the user message `What iphones do we have available? Tell me the details about them`.
Consume the complete SSE response and compare final prose with `get_product_snapshot`.

**Expected:** product facts match tool results. **Actual:** snapshot price/stock
was 999.99/47; final prose stated $999/5. Mock final prose was a fixed string.
[Current test](../tests/api/ollama/chat-tools.post.spec.ts) checks tool payloads
and mock prose separately; passing it does not establish answer grounding or a
real-model defect.

## BUG-002: a deleted account's JWT can produce 500

**Observed:** 23 October 2026. **Status:** fix unconfirmed.

**Reproduce:** register/sign in, retain the JWT, delete the account through
`DELETE /api/v1/users/{username}/right-to-be-forgotten`, then repeat DELETE or
GET `/api/v1/users/{username}` with that JWT.

**Expected:** a documented authentication/missing-resource error; precedence
needs confirmation. **Actual:** 500. The
[lifecycle test](../tests/api/users/right-to-be-forgotten.delete.spec.ts) verifies
absence through an independent observer; it does not accept 500 as cleanup success
or assert immediate access-JWT revocation.

## BUG-003: prompt request parsing and type validation

**Observed:** 6 October 2026. **Status:** fixes unconfirmed; intended-behavior
regressions are not automated.

**Reproduce:** with a valid JWT, PUT `/api/v1/users/chat-system-prompt` using
malformed JSON, no body or `{"chatSystemPrompt":{}}`; repeat with
`{"chatSystemPrompt":123}`. The tool-prompt endpoint behaves similarly with
`toolSystemPrompt`.

**Expected:** 400 validation errors, preserving the previous value.
**Actual:** malformed/object requests return 401 although subsequent GET works;
numeric input returns 200 and persists `"123"`. See the
[chat-prompt spec](../tests/api/users/chat-system-prompt.put.spec.ts) for current scope.

## BUG-004: QR Accept negotiation returns 401

**Observed:** 20 October 2026. **Status:** fix unconfirmed; incompatible-Accept
regression is not automated.

**Reproduce:** with a valid JWT, POST `/api/v1/qr/create` with JSON
`{"text":"https://example.invalid/qr-core"}` and `Accept: application/json`.
Repeat with `Accept: image/png, application/json`.

**Expected:** a media-negotiation rejection for JSON-only Accept and 200 PNG
for compatible Accept. **Actual:** 401 for JSON-only, 200 for compatible headers.
[Current QR tests](../tests/api/qr/create.post.spec.ts) use compatible Accept.

## BUG-005: existing traffic detail returned 500

**Observed:** 20 October 2026. **Status:** did not reproduce on 23 October;
root cause/fix unconfirmed.

**Reproduce:** generate a unique `api_<UUID>` session header, GET
`/api/v1/traffic/info`, find that request in the session-scoped
`/api/v1/traffic/logs?page=0&size=10`, then GET
`/api/v1/traffic/logs/{correlationId}` with the same `X-Client-Session-Id`.

**Expected:** 200 with the captured entry. **Actual:** 500 for found entries;
fresh unknown IDs returned empty 404. The
[regression test](../tests/api/traffic/logs-correlation-id.get.spec.ts) retains
the 200 assertion and passed on the last recorded recheck. This covers legacy
public traffic mode, not protected mode.
