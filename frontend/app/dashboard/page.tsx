import { PageLayout } from '@/components/layout/PageLayout';
import { StatCard } from '@/components/cards/StatCard';
import { recentBatches } from '@/lib/mock-data';
import { StatusBar } from '@/components/charts/StatusBar';

export default function DashboardPage() {
  return (
    <PageLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Farms" value="124" />
        <StatCard label="Active Batches" value="42" />
        <StatCard label="On-time Shipments" value="91%" />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Recent Batches</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {recentBatches.map((b) => (
              <li key={b.id} className="flex justify-between"><span>{b.code} • {b.crop}</span><span>{b.status}</span></li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 className="font-semibold">Supply Chain Status</h2>
          <p className="mt-3 text-sm">In Transit</p>
          <StatusBar value={68} />
          <p className="mt-3 text-sm">Delivered</p>
          <StatusBar value={91} />
        </div>
      </div>
    </PageLayout>
  );
}
