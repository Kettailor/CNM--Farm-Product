import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { BatchEntity } from '../../domain/entities/batch.entity';
import { BatchRepository } from '../../domain/repositories/batch.repository';

@Injectable()
export class PrismaBatchRepository implements BatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(batch: BatchEntity): Promise<BatchEntity> {
    const created = await this.prisma.batch.create({
      data: {
        id: batch.id,
        farmId: batch.farmId,
        batchCode: batch.code,
        totalQuantityKg: batch.quantityKg,
        harvestDate: batch.harvestDate,
        status: batch.status
      }
    });

    return new BatchEntity(created.id, created.farmId, created.batchCode, '', Number(created.totalQuantityKg), created.harvestDate, '', created.status);
  }

  async findByCode(code: string): Promise<BatchEntity | null> {
    const batch = await this.prisma.batch.findUnique({ where: { batchCode: code } });
    return batch
      ? new BatchEntity(batch.id, batch.farmId, batch.batchCode, '', Number(batch.totalQuantityKg), batch.harvestDate, '', batch.status)
      : null;
  }

  async listByFarm(farmId: string): Promise<BatchEntity[]> {
    const batches = await this.prisma.batch.findMany({ where: { farmId } });
    return batches.map((batch) => new BatchEntity(batch.id, batch.farmId, batch.batchCode, '', Number(batch.totalQuantityKg), batch.harvestDate, '', batch.status));
  }
}
