import Link from 'next/link';
import { PageLayout } from '@/components/layout/PageLayout';

const farms = [
  { id: 'f1', name: 'Green Valley Farm', location: 'Dak Lak', plots: 12 },
  { id: 'f2', name: 'Sunrise Farm', location: 'Lam Dong', plots: 8 }
];

export default function FarmsPage() {
  return (
    <PageLayout title="Farm Management">
      <div className="card">
        <h2 className="font-semibold">Farm List</h2>
        <div className="mt-4 space-y-2">
          {farms.map((farm) => (
            <Link key={farm.id} href={`/farms/${farm.id}`} className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <div className="flex justify-between"><span>{farm.name}</span><span>{farm.location}</span></div>
            </Link>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
