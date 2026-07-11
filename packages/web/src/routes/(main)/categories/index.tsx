import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

import { Skeleton } from '@/components/ui/skeleton';
import { CategoryCard } from '@/components/category-card';
import { fetchCategories } from '@/lib/catalog-client';

export const Route = createFileRoute('/(main)/categories/')({
  component: RouteComponent,
});

function RouteComponent() {
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  return (
    <div className='flex flex-col gap-6'>
      <h1 className='font-heading text-2xl'>Categories</h1>
      {categoriesQuery.isError && (
        <p className='text-foreground/70'>
          Could not load categories. Is the catalog service running?
        </p>
      )}
      <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
        {categoriesQuery.isPending
          ? Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className='h-24' />
            ))
          : (categoriesQuery.data ?? []).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
      </div>
    </div>
  );
}
