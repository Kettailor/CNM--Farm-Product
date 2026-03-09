import { PageLayout } from '@/components/layout/PageLayout';

export default function SupplyChainPage() {
  return (
    <PageLayout title="Supply Chain">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Shipment Tracking</h2>
          <p className="mt-2 text-sm">Monitor shipment status and transport checkpoints.</p>
        </div>
        <div className="card">
          <h2 className="font-semibold">Warehouse Management</h2>
          <p className="mt-2 text-sm">Track inbound/outbound stock and storage capacity.</p>
        </div>
      </div>
    </PageLayout>
  );
}
