import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { TraceabilityRepository, TraceabilityView } from '../../domain/repositories/traceability.repository';

@Injectable()
export class PrismaTraceabilityRepository implements TraceabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getByBatchCode(batchCode: string): Promise<TraceabilityView | null> {
    const batch = await this.prisma.batch.findUnique({
      where: { code: batchCode },
      include: {
        farm: true,
        processLogs: true,
        shipments: true,
        certifications: true
      }
    });

    if (!batch) return null;

    return {
      batchCode: batch.code,
      qrToken: batch.qrToken,
      farm: { id: batch.farm.id, name: batch.farm.name, location: batch.farm.location },
      processing: batch.processLogs.map((log) => ({
        step: log.step,
        facility: log.facility,
        processedAt: log.processedAt
      })),
      shipments: batch.shipments.map((s) => ({
        fromLocation: s.fromLocation,
        toLocation: s.toLocation,
        carrier: s.carrier,
        departedAt: s.departedAt,
        arrivedAt: s.arrivedAt
      })),
      certifications: batch.certifications.map((c) => ({
        standard: c.standard,
        issuer: c.issuer,
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt
      }))
    };
  }
}
