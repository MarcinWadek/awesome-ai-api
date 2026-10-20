import { expect, type APIResponse } from '@playwright/test';

export async function expectQrPng(response: APIResponse): Promise<void> {
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/png');
  const png = await response.body();
  expect(png.length).toBeGreaterThan(45);
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(png.readUInt32BE(8)).toBe(13);
  expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');
  expect(png.readUInt32BE(16)).toBe(400);
  expect(png.readUInt32BE(20)).toBe(400);
  expect(png.subarray(-12).toString('hex')).toBe('0000000049454e44ae426082');
}
