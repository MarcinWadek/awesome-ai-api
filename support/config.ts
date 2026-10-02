import type { LoginRequest } from '../types/auth';

export const apiConfig = {
  baseUrl: process.env.API_BASE_URL ?? '',
  validLoginCredentials: {
    username: process.env.API_LOGIN_USERNAME ?? '',
    password: process.env.API_LOGIN_PASSWORD ?? '',
  } satisfies LoginRequest,
} as const;
