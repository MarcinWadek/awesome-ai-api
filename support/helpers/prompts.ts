import { expect } from '@playwright/test';
import type { UsersClient } from '../../clients/users.client';
import type { ChatSystemPrompt, ToolSystemPrompt } from '../../types/prompts';
import { json, expectNonEmptyString } from '../assertions/http';

export async function readChatPrompt(users: UsersClient, token: string): Promise<string> {
  const body = await json<ChatSystemPrompt>(await users.getChatSystemPrompt(token));
  expectNonEmptyString(body.chatSystemPrompt);
  return body.chatSystemPrompt;
}

export async function setChatPrompt(users: UsersClient, token: string, value: string | null): Promise<void> {
  const body = await json<ChatSystemPrompt>(await users.updateChatSystemPrompt({ chatSystemPrompt: value }, token));
  expect(body.chatSystemPrompt).toBe(value);
}

export async function readToolPrompt(users: UsersClient, token: string): Promise<string> {
  const body = await json<ToolSystemPrompt>(await users.getToolSystemPrompt(token));
  expectNonEmptyString(body.toolSystemPrompt);
  return body.toolSystemPrompt;
}

export async function setToolPrompt(users: UsersClient, token: string, value: string | null): Promise<void> {
  const body = await json<ToolSystemPrompt>(await users.updateToolSystemPrompt({ toolSystemPrompt: value }, token));
  expect(body.toolSystemPrompt).toBe(value);
}
