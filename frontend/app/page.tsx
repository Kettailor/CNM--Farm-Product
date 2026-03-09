import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-lg text-center">
        <h1 className="text-2xl font-bold">Farm Product Traceability System</h1>
        <p className="mt-2 text-slate-600">Modern UI for Admin, Farmer, Distributor, Retailer, and Consumer.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Link href="/login" className="rounded-lg bg-brand-500 px-4 py-2 text-white">Login</Link>
          <Link href="/register" className="rounded-lg border border-slate-300 px-4 py-2">Register</Link>
        </div>
      </div>
    </div>
  );
}
