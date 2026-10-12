import type { APIRequestContext, APIResponse } from '@playwright/test';

export class ProductsClient {
  constructor(private readonly request: APIRequestContext) {}

  async getProducts(token?: string): Promise<APIResponse> {
    return this.request.get('/api/v1/products', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    });
  }

  async getProduct(id: number | string, token?: string): Promise<APIResponse> {
    return this.request.get(`/api/v1/products/${encodeURIComponent(String(id))}`, {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    });
  }
}
