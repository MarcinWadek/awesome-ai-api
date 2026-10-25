import type { RefreshTokenRequest } from '../types/auth';

export const invalidRefreshTokenCases = [
  { title: 'missing', data: {} },
  { title: 'empty', data: { refreshToken: '' } },
  { title: 'whitespace-only', data: { refreshToken: '   ' } },
] satisfies Array<{ title: string; data: Partial<RefreshTokenRequest> }>;
