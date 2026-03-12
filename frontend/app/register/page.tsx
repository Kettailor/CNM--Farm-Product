'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const roles = ['Admin', 'Farmer', 'Distributor', 'Retailer', 'Consumer'];

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Farmer');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api.register({ fullName, email, password, role });
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to register.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="card">
        <h1 className="text-xl font-semibold">Register</h1>
        <form className="mt-4 space-y-3" onSubmit={handleRegister}>
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>
          <Button type="submit" disabled={isLoading}>{isLoading ? 'Creating...' : 'Create account'}</Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </div>
  );
}
