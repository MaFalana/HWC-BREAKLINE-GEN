const BASE =
  (import.meta as any).env?.PUBLIC_API_BASE_URL ??
  'https://surface-gen-api.purplebush-adcf4e3b.eastus.azurecontainerapps.io';

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
