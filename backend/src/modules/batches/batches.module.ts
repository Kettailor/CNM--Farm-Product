import { Module } from '@nestjs/common';
import { BATCH_REPOSITORY } from './domain/repositories/batch.repository';
import { CreateBatchUseCase } from './application/use-cases/create-batch.use-case';
import { ListFarmBatchesUseCase } from './application/use-cases/list-farm-batches.use-case';
import { PrismaBatchRepository } from './infrastructure/repositories/prisma-batch.repository';
import { BatchesController } from './interfaces/controllers/batches.controller';

@Module({
  controllers: [BatchesController],
  providers: [
    CreateBatchUseCase,
    ListFarmBatchesUseCase,
    { provide: BATCH_REPOSITORY, useClass: PrismaBatchRepository }
  ],
  exports: [BATCH_REPOSITORY]
})
export class BatchesModule {}
