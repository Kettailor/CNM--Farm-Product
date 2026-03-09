import { PageLayout } from '@/components/layout/PageLayout';

export default function ActivitiesPage() {
  return (
    <PageLayout title="Farming Activities">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card"><h3 className="font-semibold">Fertilizer Usage</h3><p className="mt-2 text-sm">Record type, dosage, and date.</p></div>
        <div className="card"><h3 className="font-semibold">Pesticide Usage</h3><p className="mt-2 text-sm">Capture product and safety interval.</p></div>
        <div className="card"><h3 className="font-semibold">Irrigation Logs</h3><p className="mt-2 text-sm">Track water source and volume.</p></div>
      </div>
    </PageLayout>
  );
}
