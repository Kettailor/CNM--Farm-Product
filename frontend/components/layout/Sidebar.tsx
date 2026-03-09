import Link from 'next/link';

const links = [
  ['Dashboard', '/dashboard'],
  ['Farms', '/farms'],
  ['Activities', '/activities'],
  ['Batches', '/batches'],
  ['Processing', '/processing'],
  ['Supply Chain', '/supply-chain'],
  ['QR', '/qr']
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-4">
      <h2 className="mb-4 text-lg font-semibold text-brand-700">Farm Traceability</h2>
      <nav className="space-y-2 text-sm">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="block rounded-md px-3 py-2 hover:bg-slate-100">
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
