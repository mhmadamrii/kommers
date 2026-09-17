import { QueryClient } from '@tanstack/solid-query';

// A factory, not a module-level singleton: SSR handles one request per
// process, so a shared client would leak one visitor's cached queries
// (e.g. `me`) into every other visitor's server-rendered page. Call this
// inside the root component body instead — that naturally gives a fresh
// client per SSR request, and a single instance for the client's whole
// session (the component only mounts once in the browser).
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}
