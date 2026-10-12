import { OllamaClient } from '../clients/ollama.client';
import { test as authenticatedTest } from './auth.fixture';

export const test = authenticatedTest.extend<{ ollamaClient: OllamaClient }>({
  ollamaClient: async ({ request }, use) => {
    await use(new OllamaClient(request));
  },
});

export { expect } from './auth.fixture';
