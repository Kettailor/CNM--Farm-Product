import { Module } from '@nestjs/common';
import { CreateFarmUseCase } from './application/use-cases/create-farm.use-case';
import { ListOwnerFarmsUseCase } from './application/use-cases/list-owner-farms.use-case';
import { FARM_REPOSITORY } from './domain/repositories/farm.repository';
import { PrismaFarmRepository } from './infrastructure/repositories/prisma-farm.repository';
import { FarmsController } from './interfaces/controllers/farms.controller';

@Module({
  controllers: [FarmsController],
  providers: [
    CreateFarmUseCase,
    ListOwnerFarmsUseCase,
    { provide: FARM_REPOSITORY, useClass: PrismaFarmRepository }
  ]
})
export class FarmsModule {}
