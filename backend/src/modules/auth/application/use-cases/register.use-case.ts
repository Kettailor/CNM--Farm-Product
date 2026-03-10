import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';
import { AUTH_REPOSITORY, AuthRepository } from '../../domain/repositories/auth.repository';
import { RegisterDto } from '../dto/register.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class RegisterUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private readonly authRepository: AuthRepository) {}

  async execute(dto: RegisterDto): Promise<UserEntity> {
    const existing = await this.authRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const user = new UserEntity(
      randomUUID(),
      dto.email,
      dto.username,
      dto.fullName,
      await bcrypt.hash(dto.password, 12),
      dto.role
    );

    return this.authRepository.save(user);
  }
}
