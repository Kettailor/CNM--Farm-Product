import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { BatchStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { BatchEntity } from '../../domain/entities/batch.entity';
import { BATCH_REPOSITORY, BatchRepository } from '../../domain/repositories/batch.repository';
import { CreateBatchDto } from '../dto/create-batch.dto';

@Injectable()
export class CreateBatchUseCase {
  constructor(@Inject(BATCH_REPOSITORY) private readonly batchRepository: BatchRepository) {}

  async execute(dto: CreateBatchDto): Promise<BatchEntity> {
    const existing = await this.batchRepository.findByCode(dto.code);
    if (existing) throw new ConflictException('Batch code already exists');

    const batch = new BatchEntity(
      randomUUID(),
      dto.farmId,
      dto.code,
      dto.cropName,
      dto.quantityKg,
      new Date(dto.harvestDate),
      randomUUID(),
      BatchStatus.HARVESTED
    );

    return this.batchRepository.save(batch);
  }
}
