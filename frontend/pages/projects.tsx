import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import { useApi } from '../hooks/useApi';

export default function ProjectsPage() {
  const api = useApi();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => { api.get('/projects').then(setProjects).catch(() => null); }, [api]);

  return <PageShell>
    <h1 className="text-2xl font-semibold mb-4">Projects</h1>
    <table className="w-full text-sm">
      <thead><tr><th>Name</th><th>Location</th><th>Status</th><th>Progress</th></tr></thead>
      <tbody>{projects.map((p) => <tr key={p.id} className="border-t"><td>{p.name}</td><td>{p.location}</td><td>{p.status}</td><td>{p.progress}%</td></tr>)}</tbody>
    </table>
  </PageShell>;
}
