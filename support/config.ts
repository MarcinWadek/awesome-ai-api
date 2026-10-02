import dotenv from 'dotenv';
import path from 'node:path';
import type { LoginRequest } from '../types/auth';

// Load before reading values, including when imported by playwright.config.ts.
// Shell and CI environment variables take precedence over the local file.
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(
      `Missing required environment variable ${name}. Set it in .env (see .env.example) or in your shell/CI environment.`,
    );
  }
  return value;
}

export const apiConfig = {
  baseUrl: requireEnv('API_BASE_URL'),
  validLoginCredentials: {
    username: requireEnv('API_LOGIN_USERNAME'),
    password: requireEnv('API_LOGIN_PASSWORD'),
  } satisfies LoginRequest,
} as const;
