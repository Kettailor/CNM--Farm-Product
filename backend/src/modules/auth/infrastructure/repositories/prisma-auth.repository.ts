import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { UserEntity } from '../../domain/entities/user.entity';
import { AuthRepository } from '../../domain/repositories/auth.repository';

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? new UserEntity(user.id, user.email, user.fullName, user.passwordHash, user.role) : null;
  }

  async save(user: UserEntity): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        passwordHash: user.passwordHash,
        role: user.role
      }
    });

    return new UserEntity(created.id, created.email, created.fullName, created.passwordHash, created.role);
  }
}
