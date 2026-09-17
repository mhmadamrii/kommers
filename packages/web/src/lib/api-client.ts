import { getRequestEvent, isServer } from 'solid-js/web';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// credentials: 'include' sends the httpOnly auth cookie — the API only
// accepts requests from origins it has CORS-allowlisted (see
// packages/server CORS_ALLOWED_ORIGINS).
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  // Browser fetch attaches the cookie automatically via credentials:'include'.
  // Server-side (SSR) fetch has no browser cookie jar to draw from — without
  // forwarding the incoming request's cookie explicitly, every SSR render
  // would look logged-out until client-side hydration re-fetches.
  if (isServer) {
    const cookie = getRequestEvent()?.request.headers.get('cookie');
    if (cookie) headers.set('cookie', cookie);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON — keep statusText
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
