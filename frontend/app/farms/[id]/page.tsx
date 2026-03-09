import { PageLayout } from '@/components/layout/PageLayout';

export default function FarmDetailPage() {
  return (
    <PageLayout title="Farm Details">
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold">Manage Farm Plots</h2>
          <ul className="mt-3 list-disc pl-4 text-sm">
            <li>Plot A1 - 2.5 ha</li>
            <li>Plot A2 - 1.8 ha</li>
            <li>Plot B1 - 3.0 ha</li>
          </ul>
        </section>
        <section className="card">
          <h2 className="font-semibold">Crop Management</h2>
          <ul className="mt-3 list-disc pl-4 text-sm">
            <li>Mango (Growing)</li>
            <li>Coffee (Harvest soon)</li>
          </ul>
        </section>
      </div>
    </PageLayout>
  );
}
