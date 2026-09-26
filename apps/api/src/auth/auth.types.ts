export interface AccessTokenPayload {
  sub: number;
  username: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: number;
  jti: string;
  type: 'refresh';
}

