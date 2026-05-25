export interface AuthUser {
  username: string;
  display_name: string;
  career: string;
  roles: string[];
  email?: string;
  phone_number?: string;
  is_email_verified?: boolean;
  theme_preference?: 'system' | 'light' | 'dark';
  isDark?: boolean;
  profile_image_url?: string | null;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  expiresAt: number;
}
