import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { ProductCreateRequest, ProductUpdateRequest } from '../types/products';
import { safeRequest } from '../support/safe-request';

export class ProductsClient {
  constructor(private readonly request: APIRequestContext) {}

  async createProduct(data: ProductCreateRequest, token?: string): Promise<APIResponse> {
    return safeRequest('Create product', () => this.request.post('/api/v1/products', {
      data,
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async updateProduct(id: number, data: ProductUpdateRequest, token?: string): Promise<APIResponse> {
    return safeRequest('Update product', () => this.request.put(`/api/v1/products/${id}`, {
      data,
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async deleteProduct(id: number, token?: string): Promise<APIResponse> {
    return safeRequest('Delete product', () => this.request.delete(`/api/v1/products/${id}`, {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async getProducts(token?: string): Promise<APIResponse> {
    return safeRequest('Read products', () => this.request.get('/api/v1/products', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async getProduct(id: number | string, token?: string): Promise<APIResponse> {
    return safeRequest('Read product', () => this.request.get(`/api/v1/products/${encodeURIComponent(String(id))}`, {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }
}
