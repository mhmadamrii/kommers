import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <div>
      <h1>kommers</h1>
      <p>TanStack Start scaffold running.</p>
      <h1 className='text-3xl font-bold underline'>Hello World!</h1>
    </div>
  );
}
