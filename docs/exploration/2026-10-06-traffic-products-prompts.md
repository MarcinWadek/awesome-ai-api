# Eight-endpoint exploration results

Observed on **6 October 2026** at `https://awesome.byst.re`, against live OpenAPI,
the saved contract and backend source. Latest run: 104 endpoint probes plus two
cleanup responses. Across three runs, all six disposable accounts were deleted
with `204`; shared accounts and catalogue data were unchanged.

## Findings

All eight happy paths worked. Both prompt PUTs have confirmed parsing/type bugs;
see the [concise bug report](../prompt-bug-report.md) for reproduction steps.

| Area | Observed behavior |
| --- | --- |
| Traffic info/logs | Public in legacy mode; valid session header scopes topic/logs. Session IDs require 16–128 ASCII letters, digits, underscores or hyphens. Invalid session gives `400`; explicit invalid Bearer gives `401`. |
| Traffic pagination | Newest first; filters worked. Sizes 0/-1 clamp to 1, 1000 clamps to 100 here. Invalid numeric/time inputs give `400`; blank bounds work; reversed bounds return empty `200`. |
| Product list/ID | Authenticated array and matching ID read; missing IDs give `404`, malformed IDs `400`, missing/invalid auth `401`. Timestamps have no offset; keep large IDs as strings. |
| Chat/tool prompts | Unicode/multiline persistence and user/prompt isolation worked. Omitted/null/empty/whitespace resets give the default on GET; PUT echoes the stored value. |
| Prompt length | 5000 ASCII characters accepted; 5001 rejected with `400` without replacing the stored value. Unicode length boundaries were not established. |

Error envelopes differ: auth/not-found use `message`, query/ID errors use `error`,
and prompt length errors use the field name. Server-side cause of parsing bugs
was not established; the same token still worked on subsequent GET.

Only selected metadata/comparison results were saved. Our own Bearer token was
absent from session-filtered logs; this was not a full credential/PII audit.

Subsequent automation added 24 core tests; full suite **50/50 passed**.
Current coverage and gaps: [root plan](../../api-test-plan.md) and its folder plans.
