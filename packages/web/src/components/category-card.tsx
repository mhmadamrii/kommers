import { Link } from '@tanstack/react-router';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Category } from '@/lib/mock/categories';

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link to='/products' search={{ category: category.slug }}>
      <Card className='transition-transform hover:-translate-y-0.5'>
        <CardHeader>
          <CardTitle className='text-base'>{category.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-foreground/70'>
            {category.productCount} products
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
