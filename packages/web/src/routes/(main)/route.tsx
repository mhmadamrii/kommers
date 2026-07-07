import { createFileRoute, Outlet } from '@tanstack/react-router';

import { SiteHeader } from './-components/site-header';

export const Route = createFileRoute('/(main)')({
  component: MainLayout,
});

function MainLayout() {
  return (
    <>
      <SiteHeader />
      <main className='mx-auto max-w-6xl px-4 py-6'>
        <Outlet />
      </main>
    </>
  );
}
