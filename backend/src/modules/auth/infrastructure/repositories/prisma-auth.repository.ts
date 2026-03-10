import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { UserEntity } from '../../domain/entities/user.entity';
import { AuthRepository } from '../../domain/repositories/auth.repository';

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true }, take: 1 } }
    });

    return user
      ? new UserEntity(
          user.id,
          user.email,
          user.username,
          user.fullName,
          user.passwordHash,
          user.userRoles[0]?.role.code ?? 'FARM'
        )
      : null;
  }

  async save(user: UserEntity): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        passwordHash: user.passwordHash,
        userRoles: {
          create: {
            role: {
              connect: { code: user.role }
            }
          }
        }
      },
      include: { userRoles: { include: { role: true }, take: 1 } }
    });

    return new UserEntity(
      created.id,
      created.email,
      created.username,
      created.fullName,
      created.passwordHash,
      created.userRoles[0]?.role.code ?? user.role
    );
  }
}
