import { UserRole } from '@prisma/client';

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly passwordHash: string,
    public readonly role: UserRole
  ) {}
}
