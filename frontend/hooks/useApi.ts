import { useMemo } from 'react';

export function useApi() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  return useMemo(() => ({
    get: async (path: string, token?: string) => {
      const res = await fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) throw new Error('Request failed');
      return res.json();
    },
  }), [baseUrl]);
}
