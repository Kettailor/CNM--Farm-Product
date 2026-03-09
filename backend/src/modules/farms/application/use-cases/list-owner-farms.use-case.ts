import { Inject, Injectable } from '@nestjs/common';
import { FARM_REPOSITORY, FarmRepository } from '../../domain/repositories/farm.repository';

@Injectable()
export class ListOwnerFarmsUseCase {
  constructor(@Inject(FARM_REPOSITORY) private readonly farmRepository: FarmRepository) {}

  execute(ownerId: string) {
    return this.farmRepository.findByOwner(ownerId);
  }
}
