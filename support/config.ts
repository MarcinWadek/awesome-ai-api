import dotenv from 'dotenv';
import path from 'node:path';
import type { LoginRequest } from '../types/auth';

// Load before reading values, including when imported by playwright.config.ts.
// Shell and CI environment variables take precedence over the local file.
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

function requireEnv(name: string, defaultValue?: string): string {
  const value = process.env[name] ?? defaultValue;
  if (!value?.trim()) {
    throw new Error(
      `Missing required environment variable ${name}. Set it in .env (see .env.example) or in your shell/CI environment.`,
    );
  }
  return value;
}

export const apiConfig = {
  baseUrl: requireEnv('API_BASE_URL', 'https://awesome.byst.re'),
  get validLoginCredentials(): LoginRequest {
    return {
      username: requireEnv('API_LOGIN_USERNAME'),
      password: requireEnv('API_LOGIN_PASSWORD'),
    };
  },
} as const;

export const adminApiConfig = {
  baseUrl: requireEnv('ADMIN_API_BASE_URL', 'https://aitesters.byst.re'),
  get validLoginCredentials(): LoginRequest {
    return {
      username: requireEnv('ADMIN_API_LOGIN_USERNAME'),
      password: requireEnv('ADMIN_API_LOGIN_PASSWORD'),
    };
  },
} as const;
