import type { APIResponse } from '@playwright/test';

// Playwright transport errors include request headers, including Bearer tokens.
// The reporter separately redacts automatically recorded API step errors.
export async function safeRequest(
  operation: string,
  send: () => Promise<APIResponse>,
): Promise<APIResponse> {
  try {
    return await send();
  } catch {
    throw new Error(`${operation} request failed; sensitive request details omitted`);
  }
}
