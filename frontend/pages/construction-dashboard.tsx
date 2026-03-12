import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import { useApi } from '../hooks/useApi';

export default function DashboardPage() {
  const api = useApi();
  const [data, setData] = useState<any>();

  useEffect(() => { api.get('/reports/dashboard').then(setData).catch(() => null); }, [api]);

  return <PageShell>
    <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
    <div className="grid grid-cols-4 gap-4">
      {['projects', 'tasks', 'completedTasks', 'completionRate'].map((k) => (
        <div key={k} className="border rounded-lg p-3">
          <p className="text-sm capitalize text-gray-500">{k}</p>
          <p className="text-xl font-bold">{data?.[k] ?? '-'}</p>
        </div>
      ))}
    </div>
  </PageShell>;
}
