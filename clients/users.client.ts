import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { ChatSystemPrompt, ToolSystemPrompt } from '../types/prompts';
import type { UserUpdateRequest } from '../types/users';
import { safeRequest } from '../support/safe-request';

export class UsersClient {
  constructor(private readonly request: APIRequestContext) {}

  async getUsers(token?: string): Promise<APIResponse> {
    return this.request.get('/api/v1/users', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    });
  }

  async getUser(username: string, token?: string): Promise<APIResponse> {
    return this.request.get(`/api/v1/users/${encodeURIComponent(username)}`, {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    });
  }

  async getMe(token?: string): Promise<APIResponse> {
    return safeRequest('Read current user', () => this.request.get('/api/v1/users/me', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async updateUser(username: string, data: UserUpdateRequest, token?: string): Promise<APIResponse> {
    return safeRequest('Update user', () => this.request.put(`/api/v1/users/${encodeURIComponent(username)}`, {
      data,
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async deleteUser(username: string, token?: string): Promise<APIResponse> {
    return safeRequest('Delete user', () => this.request.delete(`/api/v1/users/${encodeURIComponent(username)}`, {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    }));
  }

  async forgetUser(username: string, token: string): Promise<APIResponse> {
    return safeRequest('Delete generated user', () => this.request.delete(
      `/api/v1/users/${encodeURIComponent(username)}/right-to-be-forgotten`,
      { headers: { Authorization: `Bearer ${token}` } },
    ));
  }

  async getChatSystemPrompt(token?: string): Promise<APIResponse> {
    return this.request.get('/api/v1/users/chat-system-prompt', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    });
  }

  async updateChatSystemPrompt(data: Partial<ChatSystemPrompt>, token?: string): Promise<APIResponse> {
    return this.request.put('/api/v1/users/chat-system-prompt', {
      data,
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    });
  }

  async getToolSystemPrompt(token?: string): Promise<APIResponse> {
    return this.request.get('/api/v1/users/tool-system-prompt', {
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    });
  }

  async updateToolSystemPrompt(data: Partial<ToolSystemPrompt>, token?: string): Promise<APIResponse> {
    return this.request.put('/api/v1/users/tool-system-prompt', {
      data,
      headers: token === undefined ? undefined : { Authorization: `Bearer ${token}` },
    });
  }
}
