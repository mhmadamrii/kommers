import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { authClient, AuthApiError, type TokenPair } from '@/lib/auth-client';

export interface AuthUser {
  id: string;
  email: string;
  role: 'customer' | 'admin';
}

interface JwtPayload {
  sub: string;
  role: AuthUser['role'];
  exp: number;
}

// Access tokens are RS256 JWTs; the payload is just base64url JSON. Decoding
// is safe client-side (verification is the backend's job — the client only
// reads claims for display and expiry scheduling).
function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

// Treat tokens expiring within 30s as already expired so a request started
// now doesn't die mid-flight.
function isExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now() + 30_000;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  // setAuth derives id/role from the access token; email comes from the
  // login/register form since the JWT deliberately doesn't carry it.
  setAuth: (tokens: TokenPair, email: string) => void;
  setTokens: (tokens: TokenPair) => void;
  clear: () => void;
  setHasHydrated: (v: boolean) => void;
}

const noopStorage: Storage = {
  length: 0,
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hasHydrated: false,
      setAuth: (tokens, email) => {
        const payload = decodeJwt(tokens.access_token);
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          user: payload
            ? { id: payload.sub, email, role: payload.role }
            : null,
        });
      },
      setTokens: (tokens) =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }),
      clear: () =>
        set({ accessToken: null, refreshToken: null, user: null }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'kommers.auth',
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? noopStorage : window.localStorage,
      ),
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

// bootstrapAuth runs once on app mount: if the persisted access token is
// expired but a refresh token exists, rotate it so a returning visitor stays
// logged in (refresh TTL is 30 days vs 15 min for access tokens).
// A rejected refresh (revoked / reuse-detected / expired) clears the session;
// a network failure keeps it — the API being down is not a logout.
export async function bootstrapAuth(): Promise<void> {
  const { accessToken, refreshToken, setTokens, clear } =
    useAuthStore.getState();
  if (!refreshToken) return;
  if (accessToken && !isExpired(accessToken)) return;

  try {
    setTokens(await authClient.refresh(refreshToken));
  } catch (err) {
    if (err instanceof AuthApiError) clear();
  }
}

// logout revokes the refresh token server-side and clears local state.
// Revocation is best-effort: locally you're logged out either way.
export async function logout(): Promise<void> {
  const { refreshToken, clear } = useAuthStore.getState();
  clear();
  if (refreshToken) {
    await authClient.logout(refreshToken).catch(() => {});
  }
}
