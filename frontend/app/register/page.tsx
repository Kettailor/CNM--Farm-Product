'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const roles = ['Admin', 'Farmer', 'Distributor', 'Retailer', 'Consumer'];

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Farmer');

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="card">
        <h1 className="text-xl font-semibold">Register</h1>
        <div className="mt-4 space-y-3">
          <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>
          <Button onClick={() => api.register({ fullName, email, password, role })}>Create account</Button>
        </div>
      </div>
    </div>
  );
}
