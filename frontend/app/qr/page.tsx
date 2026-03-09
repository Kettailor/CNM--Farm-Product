import Link from 'next/link';
import { PageLayout } from '@/components/layout/PageLayout';

export default function QrPage() {
  return (
    <PageLayout title="QR Traceability">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">QR Code Generation</h2>
          <p className="mt-2 text-sm">Generate QR for each packaged batch.</p>
        </div>
        <div className="card">
          <h2 className="font-semibold">QR Scan Page</h2>
          <p className="mt-2 text-sm">Open consumer scan flow:</p>
          <Link href="/consumer/demo-token" className="mt-2 inline-block text-brand-700 underline">/consumer/demo-token</Link>
        </div>
      </div>
    </PageLayout>
  );
}
