export interface AuthUser {
  username: string;
  display_name: string;
  career: string;
  roles: string[];
  theme_preference?: 'system' | 'light' | 'dark';
  is_dark?: boolean;
  profile_image_url?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  expiresAt: number;
}
