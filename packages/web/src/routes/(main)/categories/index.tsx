import { createFileRoute } from '@tanstack/react-router';

import { CategoryCard } from '@/components/category-card';
import { categories } from '@/lib/mock/categories';

export const Route = createFileRoute('/(main)/categories/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className='flex flex-col gap-6'>
      <h1 className='font-heading text-2xl'>Categories</h1>
      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}
