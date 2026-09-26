import { createHash, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RefreshTokenPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByIdentifier(dto.identifier.trim());
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials.',
      });
    }

    return this.issueSession(user);
  }

  async refresh(rawToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(rawToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired.',
      });
    }

    if (payload.type !== 'refresh') throw new UnauthorizedException();
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || !stored.user.active) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired.',
      });
    }

    const session = await this.createTokens(stored.user);
    const replacementHash = this.hashToken(session.refreshToken);
    await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { revokedAt: new Date(), replacedBy: replacementHash },
      });
      if (revoked.count !== 1) {
        throw new UnauthorizedException({
          statusCode: 401,
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token has already been rotated.',
        });
      }
      await tx.refreshToken.create({
        data: {
          tokenHash: replacementHash,
          expiresAt: session.expiresAt,
          userId: stored.user.id,
        },
      });
    });
    return session;
  }

  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueSession(user: User) {
    const session = await this.createTokens(user);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(session.refreshToken),
        expiresAt: session.expiresAt,
        userId: user.id,
      },
    });
    return session;
  }

  private async createTokens(user: User) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, username: user.username, type: 'access' },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m') as JwtSignOptions['expiresIn'],
      },
    );
    const jti = randomUUID();
    const days = this.config.get<number>('JWT_REFRESH_TTL_DAYS', 7);
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: `${days}d`,
      },
    );
    const expiresAt = new Date(Date.now() + days * 86_400_000);

    return {
      accessToken,
      refreshToken,
      expiresAt,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
