import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(main)')({
  component: MainLayout,
});

function MainLayout() {
  return (
    <main className='mx-auto max-w-6xl px-4 py-6'>
      <Outlet />
    </main>
  );
}
