import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

export function PageLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
      </main>
    </div>
  );
}
