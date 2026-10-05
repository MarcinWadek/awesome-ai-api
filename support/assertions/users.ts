import { expect } from '@playwright/test';
import type { RegistrationRequest } from '../../types/registration';
import type { UserResponse } from '../../types/users';

export function expectRegisteredUserProfile(
  body: UserResponse,
  user: Pick<RegistrationRequest, 'username' | 'email' | 'firstName' | 'lastName'>,
): void {
  expect(Number.isInteger(body.id)).toBe(true);
  expect(body.id).toBeGreaterThan(0);
  expect(body.username).toBe(user.username);
  expect(body.email).toBe(user.email);
  expect(body.firstName).toBe(user.firstName);
  expect(body.lastName).toBe(user.lastName);
  expect(body.roles).toEqual(['ROLE_CLIENT']);
  for (const field of ['password', 'token', 'refreshToken']) {
    expect(Object.hasOwn(body, field), `Profile must omit ${field}`).toBe(false);
  }
}
