import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './interfaces/controllers/auth.controller';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { AUTH_REPOSITORY } from './domain/repositories/auth.repository';
import { PrismaAuthRepository } from './infrastructure/repositories/prisma-auth.repository';
import { JwtStrategy } from './infrastructure/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') ?? '1h' }
      })
    })
  ],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    JwtStrategy,
    { provide: AUTH_REPOSITORY, useClass: PrismaAuthRepository }
  ],
  exports: [JwtModule]
})
export class AuthModule {}
