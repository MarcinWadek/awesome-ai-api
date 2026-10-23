import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Adjustment, InventoryItem } from '../types/commerce';
import { safeRequest } from '../support/safe-request';

export class InventoryClient {
  constructor(private readonly request: APIRequestContext) {}

  async list(token?: string, params: {
    page?: number; size?: number; search?: string; category?: string;
    status?: InventoryItem['stockStatus']; lowStockThreshold?: number;
  } = {}): Promise<APIResponse> {
    return safeRequest('List inventory', () => this.request.get('/api/v1/admin/inventory', {
      params, headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async get(id: number, token?: string, lowStockThreshold?: number): Promise<APIResponse> {
    return safeRequest('Read inventory item', () => this.request.get(`/api/v1/admin/inventory/${id}`, {
      params: lowStockThreshold === undefined ? {} : { lowStockThreshold },
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async adjust(id: number, data: Adjustment, token?: string): Promise<APIResponse> {
    return safeRequest('Adjust inventory', () => this.request.post(`/api/v1/admin/inventory/${id}/adjustments`, {
      data, headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async movements(id: number, token?: string, params: { page?: number; size?: number } = {}): Promise<APIResponse> {
    return safeRequest('Read inventory movements', () => this.request.get(`/api/v1/admin/inventory/${id}/movements`, {
      params, headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }
}
