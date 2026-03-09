'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="card">
        <h1 className="text-xl font-semibold">Login</h1>
        <div className="mt-4 space-y-3">
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button onClick={() => api.login({ email, password })}>Sign in</Button>
        </div>
      </div>
    </div>
  );
}
