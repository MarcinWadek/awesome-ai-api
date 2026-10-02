export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string | null;
  refreshToken: string | null;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: Array<'ROLE_ADMIN' | 'ROLE_CLIENT'>;
  mfaRequired: boolean;
  challengeToken: string | null;
  challengeExpiresAt: string | null;
}

export interface ApiErrorResponse {
  message: string;
}
