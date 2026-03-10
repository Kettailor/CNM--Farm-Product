import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { TraceabilityRepository, TraceabilityView } from '../../domain/repositories/traceability.repository';

@Injectable()
export class PrismaTraceabilityRepository implements TraceabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getByBatchCode(batchCode: string): Promise<TraceabilityView | null> {
    const batch = await this.prisma.batch.findUnique({
      where: { batchCode },
      include: {
        farm: true,
        processingRecords: { include: { facilityActor: true } },
        shipments: { include: { sourceActor: true, destinationActor: true } },
        certifications: true,
        qrCodes: { take: 1, orderBy: { generatedAt: 'desc' } }
      }
    });

    if (!batch) return null;

    return {
      batchCode: batch.batchCode,
      qrToken: batch.qrCodes[0]?.qrToken ?? '',
      farm: { id: batch.farm.id, name: batch.farm.name, location: batch.farm.locationText },
      processing: batch.processingRecords.map((record) => ({
        step: record.processingType,
        facility: record.facilityActor?.name ?? 'N/A',
        processedAt: record.processDate
      })),
      shipments: batch.shipments.map((shipment) => ({
        fromLocation: shipment.sourceActor.name,
        toLocation: shipment.destinationActor.name,
        carrier: shipment.carrierName,
        departedAt: shipment.departedAt ?? shipment.createdAt,
        arrivedAt: shipment.deliveredAt
      })),
      certifications: batch.certifications.map((certification) => ({
        standard: certification.certType,
        issuer: certification.issuingAuthority,
        issuedAt: certification.issueDate,
        expiresAt: certification.expiryDate ?? certification.issueDate
      }))
    };
  }
}
