import { Batch, TraceabilityEvent } from '@/types';

export const recentBatches: Batch[] = [
  { id: '1', code: 'BATCH-001', crop: 'Mango', status: 'IN_TRANSIT', farmName: 'Green Valley', harvestDate: '2026-03-01' },
  { id: '2', code: 'BATCH-002', crop: 'Coffee', status: 'PROCESSING', farmName: 'Highland Farm', harvestDate: '2026-03-03' }
];

export const traceabilityTimeline: TraceabilityEvent[] = [
  { stage: 'Farm', timestamp: '2026-02-15 08:00', description: 'Crop planted at Plot A1' },
  { stage: 'Harvest', timestamp: '2026-03-01 06:15', description: 'Harvested and graded' },
  { stage: 'Processing', timestamp: '2026-03-01 14:30', description: 'Sorted and packaged' },
  { stage: 'Logistics', timestamp: '2026-03-02 09:00', description: 'Shipment departed to retailer hub' },
  { stage: 'Retailer', timestamp: '2026-03-03 11:10', description: 'Received at retail distribution center' }
];
