import { PageLayout } from '@/components/layout/PageLayout';

export default function ProcessingPage() {
  return (
    <PageLayout title="Processing">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Processing Records</h2>
          <p className="mt-2 text-sm">Track washing, sorting, drying, and quality checks.</p>
        </div>
        <div className="card">
          <h2 className="font-semibold">Packaging Management</h2>
          <p className="mt-2 text-sm">Manage unit counts, lot numbers, and package labels.</p>
        </div>
      </div>
    </PageLayout>
  );
}
