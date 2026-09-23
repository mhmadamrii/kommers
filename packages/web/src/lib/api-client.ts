import { getRequestEvent, isServer } from 'solid-js/web';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// Mirrors middleware.CookieName in packages/server — the only cookie that
// carries a session.
const AUTH_COOKIE_NAME = 'kommers_token';

// True when the current environment can actually answer "who is this
// visitor?". In the browser: always, the cookie jar is right there. During
// SSR: only if the incoming page request carried the auth cookie.
//
// This gate matters because of how @tanstack/solid-query hydrates. Whatever
// a query resolves to on the server is serialized into the page, replayed
// into the client cache, and then — see `onHydrated` in solid-query's
// build — the observer is deliberately remounted with `refetchOnMount:
// false`. So an SSR answer is final; the client will not go back and check.
// A server that fetched /api/v1/me with no cookie gets a truthful 401, and
// that "logged out" then sticks for the whole session even though the
// browser was holding a perfectly good cookie the entire time.
//
// Leaving the query disabled on the server instead means it hydrates with
// no data at all, which is the one state that makes the client fetch on
// mount (query-core's `shouldLoadOnMount` ignores `refetchOnMount` when
// `dataUpdatedAt` is 0).
export function canResolveSession(): boolean {
  if (!isServer) return true;
  const cookie = getRequestEvent()?.request.headers.get('cookie');
  return cookie?.includes(`${AUTH_COOKIE_NAME}=`) ?? false;
}

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
  // FormData bodies (multipart uploads) need the browser to set its own
  // Content-Type with a boundary — forcing application/json here would
  // send the file parts as unparseable JSON.
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

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
