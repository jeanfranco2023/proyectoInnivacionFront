import { AuthUser } from './auth-user.types';

export interface RegisterRequest {
  username: string;
  password: string;
  display_name: string;
  career: string;
}

export interface RegisterResponse {
  created: boolean;
  user: AuthUser;
}

