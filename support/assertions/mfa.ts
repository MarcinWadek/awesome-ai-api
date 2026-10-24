import { expect, type APIResponse } from '@playwright/test';
import { UsersClient } from '../../clients/users.client';
import type { RegistrationRequest } from '../../types/registration';
import type { LoginResponse } from '../../types/auth';
import type { MfaRecoveryCodes, MfaSetup } from '../../types/mfa';
import { TotpAuthenticator } from '../totp';
import { expectJsonResponse, expectNoStoreResponse } from './http';
import { expectRegisteredUserProfile } from './users';

export async function mfaJson<T>(response: APIResponse, status = 200): Promise<T> {
  expect(response.status()).toBe(status);
  expectJsonResponse(response);
  return await response.json() as T;
}

export async function expectMfaSetup(response: APIResponse, username: string): Promise<{
  setup: MfaSetup;
  totp: TotpAuthenticator;
}> {
  const setup = await mfaJson<MfaSetup>(response);
  // Provisioning values are secrets: assertion failures must never print them.
  expect(typeof setup.secret === 'string' && /^[A-Z2-7]+$/.test(setup.secret), 'Valid Base32 secret').toBe(true);
  expect(typeof setup.otpAuthUri === 'string', 'OTPAuth URI supplied').toBe(true);
  const totp = new TotpAuthenticator(setup.secret, setup.otpAuthUri);
  const uri = new URL(setup.otpAuthUri);
  expect(decodeURIComponent(uri.pathname).endsWith(`:${username}`), 'Provisioned account identity').toBe(true);
  expect(Boolean(uri.searchParams.get('issuer')), 'Issuer supplied').toBe(true);
  expect(Number.isFinite(Date.parse(setup.expiresAt)) && Date.parse(setup.expiresAt) > Date.now(), 'Pending setup expires in the future').toBe(true);
  expect(typeof setup.qrCodeDataUri === 'string' && setup.qrCodeDataUri.startsWith('data:image/png;base64,'), 'PNG QR data URI supplied').toBe(true);
  const png = Buffer.from(setup.qrCodeDataUri.slice('data:image/png;base64,'.length), 'base64');
  expect(png.length > 45, 'Complete PNG header and trailer').toBe(true);
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(png.subarray(-12).toString('hex')).toBe('0000000049454e44ae426082');
  return { setup, totp };
}

export async function expectRecoveryCodes(response: APIResponse): Promise<string[]> {
  const body = await mfaJson<MfaRecoveryCodes>(response);
  expect(Array.isArray(body.recoveryCodes), 'Recovery codes returned as an array').toBe(true);
  expect(body.recoveryCodes.length).toBeGreaterThanOrEqual(2);
  expect(body.recoveryCodes.every(code => typeof code === 'string' && /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){4}$/.test(code)), 'Recovery-code format').toBe(true);
  expect(new Set(body.recoveryCodes).size === body.recoveryCodes.length, 'Recovery codes are unique').toBe(true);
  return body.recoveryCodes;
}

export async function expectMfaChallenge(response: APIResponse): Promise<string> {
  const body = await mfaJson<LoginResponse>(response);
  expectNoStoreResponse(response);
  expect(body.mfaRequired).toBe(true);
  expect(body.token === null && body.refreshToken === null, 'Password alone must not issue session credentials').toBe(true);
  expect(typeof body.challengeToken === 'string' && body.challengeToken.length > 0, 'Challenge token supplied').toBe(true);
  expect(typeof body.challengeExpiresAt === 'string' && Date.parse(body.challengeExpiresAt) > Date.now(), 'Challenge expiry supplied').toBe(true);
  return body.challengeToken!;
}

export async function expectMfaSession(response: APIResponse, user: RegistrationRequest, users: UsersClient): Promise<LoginResponse & { token: string; refreshToken: string }> {
  const body = await mfaJson<LoginResponse>(response);
  expectNoStoreResponse(response);
  expect(body.mfaRequired).toBe(false);
  expect(body.username).toBe(user.username);
  expect(body.roles).toEqual(['ROLE_CLIENT']);
  expect(typeof body.token === 'string' && body.token.length > 0, 'Usable access token supplied').toBe(true);
  expect(typeof body.refreshToken === 'string' && body.refreshToken.length > 0, 'Refresh token supplied').toBe(true);
  expect(body.challengeToken === null && body.challengeExpiresAt === null, 'No pending challenge in completed session').toBe(true);
  const profile = await users.getMe(body.token!);
  expectRegisteredUserProfile(await mfaJson(profile), user);
  return body as LoginResponse & { token: string; refreshToken: string };
}

export async function expectMfaError(response: APIResponse, status = 401): Promise<void> {
  const body = await mfaJson<{ message: string }>(response, status);
  expect(typeof body.message === 'string' && body.message.length > 0, 'Error message supplied').toBe(true);
  expect(Object.hasOwn(body, 'token') || Object.hasOwn(body, 'refreshToken'), 'Failure must not issue session credentials').toBe(false);
}
