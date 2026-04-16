export interface AuthUser {
  username: string;
  display_name: string;
  career: string;
  roles: string[];
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  expiresAt: number;
}

