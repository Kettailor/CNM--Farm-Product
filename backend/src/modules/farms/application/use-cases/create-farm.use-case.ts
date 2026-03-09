import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FarmEntity } from '../../domain/entities/farm.entity';
import { FARM_REPOSITORY, FarmRepository } from '../../domain/repositories/farm.repository';
import { CreateFarmDto } from '../dto/create-farm.dto';

@Injectable()
export class CreateFarmUseCase {
  constructor(@Inject(FARM_REPOSITORY) private readonly farmRepository: FarmRepository) {}

  execute(dto: CreateFarmDto): Promise<FarmEntity> {
    const farm = new FarmEntity(randomUUID(), dto.ownerId, dto.name, dto.location, dto.areaHectares);
    return this.farmRepository.save(farm);
  }
}
