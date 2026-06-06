import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { redisCache } from '../config/redis';
import { BadRequestError, ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { JwtPayload } from '../types';
import { logger } from '../utils/logger';

export const authService = {
  async register(data: { email: string; username: string; password: string; avatar?: string }) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new ConflictError('Email already exists');
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existingUsername) {
      throw new ConflictError('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, config.bcrypt.saltRounds);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: hashedPassword,
        avatar: data.avatar,
      },
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return {
      user: this.sanitizeUser(user),
      token,
    };
  },

  async login(data: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    return {
      user: this.sanitizeUser(user),
      token,
    };
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.sanitizeUser(user);
  },

  async logout(token: string) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload & { exp: number };
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redisCache.set(`blacklist:${token}`, '1', ttl);
      }
    } catch (error) {
      logger.warn(`Logout token verification failed: ${error}`);
    }
  },

  generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  },

  sanitizeUser(user: any) {
    const { password, ...sanitized } = user;
    return sanitized;
  },
};
