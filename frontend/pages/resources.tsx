import PageShell from '../components/PageShell';

const data = [
  { name: 'Excavator', type: 'EQUIPMENT', workload: 70, availability: 100 },
  { name: 'Steel Crew A', type: 'LABOR', workload: 55, availability: 100 },
  { name: 'Concrete', type: 'MATERIAL', workload: 80, availability: 100 },
];

export default function ResourcesPage() {
  return <PageShell>
    <h1 className="text-2xl font-semibold mb-4">Resources</h1>
    <table className="w-full text-sm">
      <thead><tr><th>Name</th><th>Type</th><th>Workload</th><th>Availability</th></tr></thead>
      <tbody>{data.map((r) => <tr key={r.name} className="border-t"><td>{r.name}</td><td>{r.type}</td><td>{r.workload}%</td><td>{r.availability - r.workload}%</td></tr>)}</tbody>
    </table>
  </PageShell>;
}
