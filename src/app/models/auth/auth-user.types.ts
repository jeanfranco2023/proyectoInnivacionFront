export interface AuthUser {
  username: string;
  display_name: string;
  career: string;
  roles: string[];
  theme_preference?: 'system' | 'light' | 'dark';
  is_dark?: boolean;
  profile_image_url?: string | null;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  expiresAt: number;
}
