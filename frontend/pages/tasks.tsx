import { useMemo } from 'react';
import PageShell from '../components/PageShell';

const sample = [
  { id: '1', name: 'Creating architectural plans', start: 0, duration: 3, dependsOn: [] },
  { id: '2', name: 'Submit plans for approval', start: 3, duration: 2, dependsOn: ['1'] },
  { id: '3', name: 'Order materials', start: 5, duration: 4, dependsOn: ['2'] },
  { id: '4', name: 'Pour foundations', start: 10, duration: 5, dependsOn: ['3'] },
];

export default function TasksPage() {
  const links = useMemo(() => sample.flatMap((task, i) => task.dependsOn.map((dep) => ({ from: sample.findIndex((t) => t.id === dep), to: i }))), []);

  return <PageShell>
    <h1 className="text-2xl font-semibold mb-4">Tasks</h1>
    <p className="text-sm text-gray-500 mb-4">Create task, assign resource, update progress, completion and dependency tracking are exposed in backend REST APIs.</p>
    <h2 className="font-semibold">Timeline / Gantt</h2>
    <div className="space-y-2 mb-8">
      {sample.map((task) => (
        <div key={task.id} className="flex items-center gap-2">
          <div className="w-56 text-sm">{task.name}</div>
          <div className="flex-1 bg-gray-100 h-6 rounded relative">
            <div className="absolute h-6 bg-blue-500 rounded" style={{ left: `${task.start * 4}%`, width: `${task.duration * 4}%` }} />
          </div>
        </div>
      ))}
    </div>

    <h2 className="font-semibold mb-2">Dependency Graph</h2>
    <svg viewBox="0 0 500 220" className="w-full h-56 border rounded">
      {sample.map((task, i) => <g key={task.id}><rect x={20 + i * 110} y={80} width={100} height={35} rx={6} className="fill-slate-200"/><text x={25 + i * 110} y={100} className="text-[9px]">{task.name.slice(0, 18)}</text></g>)}
      {links.map((l, i) => <line key={i} x1={120 + l.from * 110} y1={98} x2={20 + l.to * 110} y2={98} stroke="#2563eb" strokeWidth="2" markerEnd="url(#arrow)" />)}
      <defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" /></marker></defs>
    </svg>
  </PageShell>;
}
