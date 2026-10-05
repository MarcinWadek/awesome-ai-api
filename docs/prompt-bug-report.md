# Prompt endpoint bug report

Confirmed: 6 October 2026 on `https://awesome.byst.re`.

Affected endpoints (numbers from the API test plan):

| Number | Endpoint | Payload field |
| --- | --- | --- |
| 8 | `PUT /api/v1/users/chat-system-prompt` | `chatSystemPrompt` |
| 10 | `PUT /api/v1/users/tool-system-prompt` | `toolSystemPrompt` |

## 1. Invalid request bodies return an authentication error

**Steps:**

1. Sign in and obtain a valid access token.
2. Call either endpoint with `Authorization: Bearer <token>` and `Content-Type: application/json`.
3. Send malformed JSON (`{`), omit the body, or send an object-valued field, e.g. `{"chatSystemPrompt":{}}` (use `toolSystemPrompt` for endpoint 10).

**Expected:** `400 Bad Request` with a validation error.

**Actual:** `401 Unauthorized` with a `message` error. A subsequent GET of the corresponding prompt succeeds with `200` using the same token.

## 2. Numeric prompt values are silently converted to strings

**Steps:**

1. Sign in and obtain a valid access token.
2. Call endpoint 8 with the headers above and `{"chatSystemPrompt":123}`, or endpoint 10 with `{"toolSystemPrompt":123}`.
3. GET the corresponding prompt using the same token.

**Expected:** Reject the numeric field with `400`; the schema allows only a string or null. Preserve the previous prompt.

**Actual:** PUT returns `200` with the value `"123"`; GET confirms that string was stored.

Evidence: [exploratory assessment](endpoints-exploration.md). Both bugs were reproduced across three runs.
