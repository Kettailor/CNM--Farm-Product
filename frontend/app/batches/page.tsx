import Link from 'next/link';
import { PageLayout } from '@/components/layout/PageLayout';
import { recentBatches } from '@/lib/mock-data';

export default function BatchesPage() {
  return (
    <PageLayout title="Batch Management">
      <div className="card mb-4"><h2 className="font-semibold">Create Harvest Batch</h2><p className="text-sm mt-2">Create batch, assign farm/crop/quantity, and track lifecycle.</p></div>
      <div className="card">
        <h2 className="font-semibold">Batch History</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {recentBatches.map((b) => (
            <li key={b.id}><Link href={`/batches/${b.id}`} className="text-brand-700 underline">{b.code}</Link> — {b.status}</li>
          ))}
        </ul>
      </div>
    </PageLayout>
  );
}
