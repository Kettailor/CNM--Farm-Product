import { FarmEntity } from '../entities/farm.entity';

export const FARM_REPOSITORY = Symbol('FARM_REPOSITORY');

export interface FarmRepository {
  save(farm: FarmEntity): Promise<FarmEntity>;
  findByOwner(ownerId: string): Promise<FarmEntity[]>;
}
