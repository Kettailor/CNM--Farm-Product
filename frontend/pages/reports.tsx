import PageShell from '../components/PageShell';

export default function ReportsPage() {
  return <PageShell>
    <h1 className="text-2xl font-semibold mb-4">Reports</h1>
    <ul className="list-disc pl-6 space-y-1 text-sm">
      <li>Project progress % report</li>
      <li>Resource workload report</li>
      <li>Timeline slippage report</li>
      <li>Activity log audit report</li>
    </ul>
  </PageShell>;
}
