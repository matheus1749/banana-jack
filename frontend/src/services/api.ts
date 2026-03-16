export const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export function getTenantId() {
  return localStorage.getItem('tenantId') ?? '';
}

export function getToken() {
  return localStorage.getItem('token') ?? '';
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: getToken() ? `Bearer ${getToken()}` : '',
      'x-tenant-id': getTenantId(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? 'Erro na API');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
