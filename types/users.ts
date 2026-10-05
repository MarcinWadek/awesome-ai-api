import type { LoginResponse } from './auth';

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  roles: LoginResponse['roles'];
  firstName: string | null;
  lastName: string | null;
}
