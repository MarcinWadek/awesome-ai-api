import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { Address, OrderStatus } from '../types/commerce';
import { safeRequest } from '../support/safe-request';

export class OrdersClient {
  constructor(private readonly request: APIRequestContext) {}

  async create(address: Address, token?: string): Promise<APIResponse> {
    return safeRequest('Create order', () => this.request.post('/api/v1/orders', {
      data: address, headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async list(token?: string, params: { page?: number; size?: number; status?: OrderStatus } = {}): Promise<APIResponse> {
    return safeRequest('List customer orders', () => this.request.get('/api/v1/orders', {
      params, headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async listAdmin(token?: string, params: { page?: number; size?: number; status?: OrderStatus } = {}): Promise<APIResponse> {
    return safeRequest('List administrator orders', () => this.request.get('/api/v1/orders/admin', {
      params, headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async get(id: number, token?: string): Promise<APIResponse> {
    return safeRequest('Read order', () => this.request.get(`/api/v1/orders/${id}`, {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async cancel(id: number, token?: string): Promise<APIResponse> {
    return safeRequest('Cancel order', () => this.request.post(`/api/v1/orders/${id}/cancel`, {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async updateStatus(id: number, status: OrderStatus, token?: string): Promise<APIResponse> {
    return safeRequest('Update order status', () => this.request.put(`/api/v1/orders/${id}/status`, {
      data: JSON.stringify(status),
      headers: { 'Content-Type': 'application/json', ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }) },
    }));
  }
}
