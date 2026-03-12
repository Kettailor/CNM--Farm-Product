const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json();
    if (payload?.detail && typeof payload.detail === 'string') {
      return payload.detail;
    }
  } catch {
    // ignore non-json payloads
  }

  return fallback;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
  if (!response.ok) {
    const message = await parseErrorMessage(response, `GET ${path} failed`);
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export async function apiPost<TBody extends object, TResponse>(
  path: string,
  body: TBody,
  token?: string
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response, `POST ${path} failed`);
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<TResponse>;
}

export const api = {
  login: (payload: { email: string; password: string }) => apiPost('/auth/login', payload),
  register: (payload: { email: string; fullName: string; password: string; role: string }) =>
    apiPost('/auth/register', payload),
  farms: () => apiGet('/farms/owner/demo-owner-id'),
  batches: () => apiGet('/batches/farm/demo-farm-id'),
  traceability: (batchCode: string) => apiGet(`/traceability/${batchCode}`)
};
