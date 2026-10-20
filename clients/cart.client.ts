import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { CartItem, CartItemUpdateRequest } from '../types/cart';
import { safeRequest } from '../support/safe-request';

export class CartClient {
  constructor(private readonly request: APIRequestContext) {}

  async getCart(token?: string): Promise<APIResponse> {
    return safeRequest('Read cart', () => this.request.get('/api/v1/cart', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async clearCart(token?: string): Promise<APIResponse> {
    return safeRequest('Clear cart', () => this.request.delete('/api/v1/cart', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async addItem(data: CartItem, token?: string): Promise<APIResponse> {
    return safeRequest('Add cart item', () => this.request.post('/api/v1/cart/items', {
      data,
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async updateItem(productId: number, data: CartItemUpdateRequest, token?: string): Promise<APIResponse> {
    return safeRequest('Update cart item', () => this.request.put(`/api/v1/cart/items/${productId}`, {
      data,
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async removeItem(productId: number, token?: string): Promise<APIResponse> {
    return safeRequest('Remove cart item', () => this.request.delete(`/api/v1/cart/items/${productId}`, {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }
}
