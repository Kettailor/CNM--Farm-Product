import { Inject, Injectable } from '@nestjs/common';
import { BATCH_REPOSITORY, BatchRepository } from '../../domain/repositories/batch.repository';

@Injectable()
export class ListFarmBatchesUseCase {
  constructor(@Inject(BATCH_REPOSITORY) private readonly batchRepository: BatchRepository) {}

  execute(farmId: string) {
    return this.batchRepository.listByFarm(farmId);
  }
}
