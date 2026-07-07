export interface EmailPasswordRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  role: 'customer' | 'admin';
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface ApiErrorBody {
  error: string;
}

export class AuthApiError extends Error {
  status: number;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error || `Auth API error (${status})`);
    this.status = status;
  }
}

const baseUrl = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:8080';

async function request<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new AuthApiError(res.status, data);
  }

  return data as T;
}

export const authClient = {
  register: (payload: EmailPasswordRequest) =>
    request<User>('/auth/register', payload),
  login: (payload: EmailPasswordRequest) =>
    request<TokenPair>('/auth/login', payload),
  refresh: (refreshToken: string) =>
    request<TokenPair>('/auth/refresh', { refresh_token: refreshToken }),
  logout: (refreshToken: string) =>
    request<void>('/auth/logout', { refresh_token: refreshToken }),
};
