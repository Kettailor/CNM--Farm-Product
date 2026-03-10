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
        ownerUserId: farm.ownerId,
        code: farm.id,
        name: farm.name,
        locationText: farm.location,
        areaHectares: farm.areaHectares
      }
    });

    return new FarmEntity(created.id, created.ownerUserId, created.name, created.locationText, Number(created.areaHectares));
  }

  async findByOwner(ownerId: string): Promise<FarmEntity[]> {
    const farms = await this.prisma.farm.findMany({ where: { ownerUserId: ownerId } });
    return farms.map((farm) => new FarmEntity(farm.id, farm.ownerUserId, farm.name, farm.locationText, Number(farm.areaHectares)));
  }
}
