import { expect, type APIResponse } from '@playwright/test';
import type { OllamaClient } from '../clients/ollama.client';
import type { ProductsClient } from '../clients/products.client';
import type { ChatChunk, GenerateChunk, ToolDefinition } from '../types/ollama';
import type { ProductResponse } from '../types/products';
import { expectJsonResponse } from './assertions/http';
import { expectChatChunks, expectCompletedStream, expectGenerateChunks, expectSseResponse } from './assertions/ollama';
import { readSseJson } from './sse';

export async function readGenerateStream(response: APIResponse, model: string): Promise<GenerateChunk[]> {
  expectSseResponse(response);
  const chunks = await readSseJson<GenerateChunk>(response);
  expectCompletedStream(chunks, model);
  expectGenerateChunks(chunks);
  return chunks;
}

export async function readChatStream(response: APIResponse, model: string): Promise<ChatChunk[]> {
  expectSseResponse(response);
  const chunks = await readSseJson<ChatChunk>(response);
  expectCompletedStream(chunks, model);
  expectChatChunks(chunks);
  return chunks;
}

export async function getProductToolContext(
  ollamaClient: OllamaClient,
  productsClient: ProductsClient,
  token: string,
): Promise<{ tools: ToolDefinition[]; catalogue: ProductResponse[] }> {
  const [definitions, products] = await Promise.all([
    ollamaClient.getToolDefinitions(token),
    productsClient.getProducts(token),
  ]);
  expect(definitions.status()).toBe(200);
  expectJsonResponse(definitions);
  expect(products.status()).toBe(200);
  expectJsonResponse(products);

  const tools = await definitions.json() as ToolDefinition[];
  const catalogue = await products.json() as ProductResponse[];
  expect(Array.isArray(tools)).toBe(true);
  expect(Array.isArray(catalogue)).toBe(true);
  expect(catalogue.find(product => product.id === 1),
    'The verified mock snapshot scenario requires product 1').toBeDefined();
  return { tools, catalogue };
}
