import { BatchStatus } from '@prisma/client';

export class BatchEntity {
  constructor(
    public readonly id: string,
    public readonly farmId: string,
    public readonly code: string,
    public readonly cropName: string,
    public readonly quantityKg: number,
    public readonly harvestDate: Date,
    public readonly qrToken: string,
    public readonly status: BatchStatus
  ) {}
}
