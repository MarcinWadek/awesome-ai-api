import type { APIResponse } from '@playwright/test';

/** Parse complete JSON SSE events, including Spring's multiline data fields. */
function parseSseJson<T>(body: string): T[] {
  const lines = body.replace(/^\uFEFF/, '').replace(/\r\n|\r/g, '\n').split('\n');
  // split's final empty element is EOF, not an additional blank event line.
  if (lines.at(-1) === '') lines.pop();
  const events: T[] = [];
  let data: string[] = [];

  for (const line of lines) {
    if (line === '') {
      if (data.length > 0) {
        try {
          events.push(JSON.parse(data.join('\n')) as T);
        } catch {
          throw new Error(`Invalid JSON in SSE event ${events.length + 1}`);
        }
        data = [];
      }
      continue;
    }
    if (line.startsWith(':')) continue;
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? '' : line.slice(separator + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') data.push(value);
  }

  if (data.length > 0) throw new Error('Incomplete SSE event at end of response');
  return events;
}

/** Playwright buffers the response through EOF; never stop at an intermediate done. */
export async function readSseJson<T>(response: APIResponse): Promise<T[]> {
  return parseSseJson<T>(await response.text());
}
