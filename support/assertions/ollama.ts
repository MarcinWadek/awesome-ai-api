import { expect, type APIResponse } from '@playwright/test';
import type { ChatChunk, GenerateChunk, StreamChunk } from '../../types/ollama';
import { expectNonEmptyString } from './http';

export function expectSseResponse(response: APIResponse): void {
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/event-stream');
}

export function expectCompletedStream(chunks: StreamChunk[], model: string): void {
  expect(chunks.length).toBeGreaterThan(1);
  for (const chunk of chunks) {
    expect(chunk.model).toBe(model);
    expect(typeof chunk.done).toBe('boolean');
    expectNonEmptyString(chunk.created_at);
    expect(Number.isFinite(Date.parse(chunk.created_at))).toBe(true);
  }
  expect(chunks.at(-1)?.done).toBe(true);
  expect(chunks.some(chunk => !chunk.done)).toBe(true);
}

/** A single model phase ends once; the tool endpoint contains several such phases. */
export function expectCompletedPhase(chunks: StreamChunk[]): void {
  expect(chunks.length).toBeGreaterThan(0);
  expect(chunks.at(-1)?.done).toBe(true);
  expect(chunks.filter(chunk => chunk.done)).toHaveLength(1);
}

/** The selected mock scenarios emit all thinking before their answer. */
export function expectThinkingBeforeContent(
  chunks: Array<{ thinking?: string | null; content?: string | null }>,
): void {
  const thinkingIndices = chunks.flatMap((chunk, index) => chunk.thinking ? [index] : []);
  const contentIndices = chunks.flatMap((chunk, index) => chunk.content ? [index] : []);
  expect(thinkingIndices.length).toBeGreaterThan(0);
  expect(contentIndices.length).toBeGreaterThan(0);
  expect(thinkingIndices.at(-1)!).toBeLessThan(contentIndices[0]);
}

function expectNullableString(value: unknown): void {
  if (value !== null && value !== undefined) expect(value).toEqual(expect.any(String));
}

export function expectGenerateChunks(chunks: GenerateChunk[]): void {
  for (const chunk of chunks) {
    expectNullableString(chunk.response);
    expectNullableString(chunk.thinking);
    if (chunk.context != null) {
      expect(Array.isArray(chunk.context)).toBe(true);
      for (const value of chunk.context) expect(Number.isInteger(value)).toBe(true);
    }
    if (chunk.total_duration != null) {
      expect(Number.isInteger(chunk.total_duration)).toBe(true);
      expect(chunk.total_duration).toBeGreaterThanOrEqual(0);
    }
  }
}

export function expectChatChunks(chunks: ChatChunk[]): void {
  for (const { message } of chunks) {
    if (message == null) continue;
    expect(['system', 'user', 'assistant', 'tool']).toContain(message.role);
    expectNullableString(message.content);
    expectNullableString(message.thinking);
    if (message.tool_calls != null) {
      expect(Array.isArray(message.tool_calls)).toBe(true);
      if (message.tool_calls.length > 0) expect(message.role).toBe('assistant');
      for (const call of message.tool_calls) {
        if (call.id != null) expectNonEmptyString(call.id);
        expectNonEmptyString(call.function.name);
        if (call.function.arguments != null) {
          expect(typeof call.function.arguments).toBe('object');
          expect(Array.isArray(call.function.arguments)).toBe(false);
        }
      }
    }
    if (message.role === 'tool') expectNonEmptyString(message.tool_name);
  }
}

export function assistantText(chunks: ChatChunk[]): string {
  return chunks.filter(chunk => chunk.message?.role === 'assistant')
    .map(chunk => chunk.message?.content ?? '').join('');
}
