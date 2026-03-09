import { PageLayout } from '@/components/layout/PageLayout';
import { traceabilityTimeline } from '@/lib/mock-data';

export default function TraceabilityPage({ params }: { params: { batchCode: string } }) {
  return (
    <PageLayout title={`Traceability: ${params.batchCode}`}>
      <div className="card">
        <h2 className="font-semibold">Full Lifecycle</h2>
        <ol className="mt-4 space-y-3 text-sm">
          {traceabilityTimeline.map((event) => (
            <li key={`${event.stage}-${event.timestamp}`} className="border-l-2 border-brand-500 pl-3">
              <p className="font-medium">{event.stage}</p>
              <p className="text-slate-500">{event.timestamp}</p>
              <p>{event.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </PageLayout>
  );
}
