import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { FarmEntity } from '../../domain/entities/farm.entity';
import { FarmRepository } from '../../domain/repositories/farm.repository';

@Injectable()
export class PrismaFarmRepository implements FarmRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(farm: FarmEntity): Promise<FarmEntity> {
    const created = await this.prisma.farm.create({
      data: {
        id: farm.id,
        ownerId: farm.ownerId,
        name: farm.name,
        location: farm.location,
        areaHectares: farm.areaHectares
      }
    });

    return new FarmEntity(created.id, created.ownerId, created.name, created.location, created.areaHectares);
  }

  async findByOwner(ownerId: string): Promise<FarmEntity[]> {
    const farms = await this.prisma.farm.findMany({ where: { ownerId } });
    return farms.map((farm) => new FarmEntity(farm.id, farm.ownerId, farm.name, farm.location, farm.areaHectares));
  }
}
