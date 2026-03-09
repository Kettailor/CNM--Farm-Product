import { BatchEntity } from '../entities/batch.entity';

export const BATCH_REPOSITORY = Symbol('BATCH_REPOSITORY');

export interface BatchRepository {
  save(batch: BatchEntity): Promise<BatchEntity>;
  findByCode(code: string): Promise<BatchEntity | null>;
  listByFarm(farmId: string): Promise<BatchEntity[]>;
}
