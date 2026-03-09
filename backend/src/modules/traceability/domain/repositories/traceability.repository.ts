export type TraceabilityView = {
  batchCode: string;
  qrToken: string;
  farm: { id: string; name: string; location: string };
  processing: { step: string; facility: string; processedAt: Date }[];
  shipments: { fromLocation: string; toLocation: string; carrier: string; departedAt: Date; arrivedAt: Date | null }[];
  certifications: { standard: string; issuer: string; issuedAt: Date; expiresAt: Date }[];
};

export const TRACEABILITY_REPOSITORY = Symbol('TRACEABILITY_REPOSITORY');

export interface TraceabilityRepository {
  getByBatchCode(batchCode: string): Promise<TraceabilityView | null>;
}
