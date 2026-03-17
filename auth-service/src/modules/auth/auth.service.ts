import crypto from 'crypto';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { hashPassword, comparePassword } from '../../utils/hash';
import { generateAccessToken } from '../../utils/jwt';
import { AppError } from '../../utils/AppError';
import type { RegisterInput, LoginInput } from './auth.schemas';

export class AuthService {
  async register(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await comparePassword(data.password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = crypto.randomUUID();

    await redis.set(
      `refresh:${refreshToken}`,
      user.id,
      'EX',
      env.REFRESH_TOKEN_TTL
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async refresh(refreshToken: string) {
    const userId = await redis.get(`refresh:${refreshToken}`);

    if (!userId) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    // Delete old refresh token
    await redis.del(`refresh:${refreshToken}`);

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const newRefreshToken = crypto.randomUUID();

    await redis.set(
      `refresh:${newRefreshToken}`,
      user.id,
      'EX',
      env.REFRESH_TOKEN_TTL
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    await redis.del(`refresh:${refreshToken}`);
  }
}

export const authService = new AuthService();
