import { expect, type APIResponse } from '@playwright/test';
import type { ChatChunk, ProductListToolResult, ToolDefinition } from '../../types/ollama';
import type { ProductResponse } from '../../types/products';
import { expectJsonResponse, expectNonEmptyString } from './http';
import { assistantText, expectAssistantMessages, expectCompletedPhase } from './ollama';
import { expectProduct } from './products';

export async function expectProductToolDefinitions(response: APIResponse): Promise<void> {
  expect(response.status()).toBe(200);
  expectJsonResponse(response);
  const tools = await response.json() as ToolDefinition[];
  expect(Array.isArray(tools)).toBe(true);
  const names = tools.map(tool => tool.function.name);
  expect(names).toEqual(expect.arrayContaining(['get_product_snapshot', 'list_products']));
  expect(new Set(names).size).toBe(names.length);
  for (const tool of tools) {
    expect(tool.type).toBe('function');
    expectNonEmptyString(tool.function.name);
    expectNonEmptyString(tool.function.description);
    expect(tool.function.parameters.type).toBe('object');
    expect(Object.keys(tool.function.parameters.properties).length).toBeGreaterThan(0);
    for (const property of Object.values(tool.function.parameters.properties)) {
      expectNonEmptyString(property.type);
    }
  }
  const snapshot = tools.find(tool => tool.function.name === 'get_product_snapshot')!;
  expect(snapshot.function.parameters.properties).toMatchObject({
    productId: { type: 'integer' }, name: { type: 'string' },
  });
  expect(snapshot.function.parameters.oneOf).toEqual(expect.arrayContaining([
    { required: ['productId'] }, { required: ['name'] },
  ]));
  const list = tools.find(tool => tool.function.name === 'list_products')!;
  expect(list.function.parameters.properties).toMatchObject({
    offset: { type: 'integer' }, limit: { type: 'integer' },
    category: { type: 'string' }, inStockOnly: { type: 'boolean' },
  });
}

export function expectProductToolFlow(chunks: ChatChunk[], finalText: string): void {
  const calls = chunks.flatMap(chunk => chunk.message?.tool_calls ?? []);
  expect(calls.map(call => call.function.name)).toEqual(['list_products', 'get_product_snapshot']);
  expect(calls[0].function.arguments).toEqual({ category: 'electronics', inStockOnly: true, limit: 25 });
  expect(calls[1].function.arguments).toEqual({ productId: 1 });

  const results = chunks.filter(chunk => chunk.message?.role === 'tool');
  expect(results.map(chunk => chunk.message?.tool_name)).toEqual(['list_products', 'get_product_snapshot']);
  for (const result of results) expect(result.done).toBe(false);

  const firstCall = chunks.findIndex(chunk => chunk.message?.tool_calls?.[0]?.function.name === 'list_products');
  const firstResult = chunks.indexOf(results[0]);
  const secondCall = chunks.findIndex(chunk => chunk.message?.tool_calls?.[0]?.function.name === 'get_product_snapshot');
  const secondResult = chunks.indexOf(results[1]);
  expect(firstResult).toBeGreaterThan(firstCall);
  expect(secondCall).toBeGreaterThan(firstResult);
  expect(secondResult).toBeGreaterThan(secondCall);

  expectCompletedPhase(chunks.slice(0, firstResult));
  expectCompletedPhase(chunks.slice(firstResult + 1, secondResult));
  const finalPhase = chunks.slice(secondResult + 1);
  expectCompletedPhase(finalPhase);
  expectAssistantMessages(finalPhase);
  expect(assistantText(finalPhase)).toBe(finalText);
}

export function expectProductToolResults(chunks: ChatChunk[], catalogue: ProductResponse[]): void {
  const list = readToolResult<ProductListToolResult>(chunks, 'list_products');
  expect(list).toMatchObject({ page: 0, size: 25 });
  expect(Array.isArray(list.products)).toBe(true);
  expect(Number.isInteger(list.total)).toBe(true);
  expect(list.total).toBeGreaterThanOrEqual(0);
  expect(list.products).toHaveLength(Math.min(25, list.total));
  expect(new Set(list.products.map(product => product.id)).size).toBe(list.products.length);
  for (const product of list.products) {
    const actual = catalogue.find(candidate => candidate.id === product.id);
    expect(actual).toBeDefined();
    expect(actual!.category.toLowerCase()).toBe('electronics');
    expect(product).toEqual({ id: actual!.id, name: actual!.name });
  }

  const snapshot = readToolResult<ProductResponse>(chunks, 'get_product_snapshot');
  expectProduct(snapshot);
  const actual = catalogue.find(product => product.id === 1)!;
  expect(snapshot).toMatchObject({ id: actual.id, name: actual.name, category: actual.category });
  // Price, stock, availability totals and timestamps may change between reads.
}

function readToolResult<T>(chunks: ChatChunk[], toolName: string): T {
  const message = chunks.find(chunk =>
    chunk.message?.role === 'tool' && chunk.message.tool_name === toolName)?.message;
  expect(message, `Expected a result from ${toolName}`).toBeDefined();
  expectNonEmptyString(message!.content);
  return JSON.parse(message!.content) as T;
}
