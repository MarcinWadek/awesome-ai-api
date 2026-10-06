import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { CartItem } from '../types/cart';

export class CartClient {
  constructor(private readonly request: APIRequestContext) {}

  async getCart(token?: string): Promise<APIResponse> {
    return this.request.get('/api/v1/cart', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    });
  }

  async clearCart(token?: string): Promise<APIResponse> {
    return this.request.delete('/api/v1/cart', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    });
  }

  // Used to arrange populated carts; item-operation coverage is tracked separately.
  async addItem(data: CartItem, token: string): Promise<APIResponse> {
    return this.request.post('/api/v1/cart/items', {
      data,
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
