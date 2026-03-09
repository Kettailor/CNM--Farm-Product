import { PageLayout } from '@/components/layout/PageLayout';

export default function BatchDetailPage() {
  return (
    <PageLayout title="Batch Details">
      <div className="card">
        <p><b>Batch:</b> BATCH-001</p>
        <p><b>Crop:</b> Mango</p>
        <p><b>Harvest Date:</b> 2026-03-01</p>
        <p><b>Status:</b> IN_TRANSIT</p>
      </div>
    </PageLayout>
  );
}
