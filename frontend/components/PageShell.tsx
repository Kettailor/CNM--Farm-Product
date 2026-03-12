import Link from 'next/link';
import { PropsWithChildren } from 'react';

const menu = [
  ['Dashboard', '/construction-dashboard'],
  ['Projects', '/projects'],
  ['Tasks', '/tasks'],
  ['Resources', '/resources'],
  ['Users', '/users'],
  ['Reports', '/reports'],
];

export default function PageShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-900 text-white p-4 font-semibold">Construction Project Management</header>
      <div className="grid grid-cols-[220px_1fr] gap-4 p-4">
        <aside className="bg-white rounded-xl p-3 shadow-sm">
          {menu.map(([label, href]) => (
            <Link key={href} className="block p-2 hover:bg-slate-100 rounded" href={href}>{label}</Link>
          ))}
        </aside>
        <main className="bg-white rounded-xl p-5 shadow-sm">{children}</main>
      </div>
    </div>
  );
}
