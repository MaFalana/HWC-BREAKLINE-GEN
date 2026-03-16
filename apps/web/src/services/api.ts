// PUBLIC_API_BASE_URL is set in .env (local) or via CI env vars (deploy)
const BASE: string = import.meta.env.PUBLIC_API_BASE_URL || '';

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { status: res.status, detail: body.detail ?? res.statusText };
  }
  // DELETE returns 204 sometimes
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getBaseUrl() { return BASE; }
