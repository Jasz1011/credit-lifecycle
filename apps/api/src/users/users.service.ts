import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByIdentifier(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        active: true,
        OR: [{ username: identifier }, { email: identifier }],
      },
    });
  }

  findById(id: number) {
    return this.prisma.user.findFirst({ where: { id, active: true } });
  }
}

