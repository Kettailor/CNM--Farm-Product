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
        code: batch.code,
        cropName: batch.cropName,
        quantityKg: batch.quantityKg,
        harvestDate: batch.harvestDate,
        qrToken: batch.qrToken,
        status: batch.status
      }
    });

    return new BatchEntity(
      created.id,
      created.farmId,
      created.code,
      created.cropName,
      created.quantityKg,
      created.harvestDate,
      created.qrToken,
      created.status
    );
  }

  async findByCode(code: string): Promise<BatchEntity | null> {
    const batch = await this.prisma.batch.findUnique({ where: { code } });
    return batch
      ? new BatchEntity(batch.id, batch.farmId, batch.code, batch.cropName, batch.quantityKg, batch.harvestDate, batch.qrToken, batch.status)
      : null;
  }

  async listByFarm(farmId: string): Promise<BatchEntity[]> {
    const batches = await this.prisma.batch.findMany({ where: { farmId } });
    return batches.map((batch) => new BatchEntity(batch.id, batch.farmId, batch.code, batch.cropName, batch.quantityKg, batch.harvestDate, batch.qrToken, batch.status));
  }
}
