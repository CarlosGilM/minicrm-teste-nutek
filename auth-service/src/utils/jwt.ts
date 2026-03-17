import jwt, { type SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { env } from '../config/env';

interface TokenPayload {
  userId: string;
  email: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as StringValue,
    algorithm: 'HS256',
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
  }) as TokenPayload;
}
