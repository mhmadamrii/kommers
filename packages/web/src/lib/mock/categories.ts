export interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export const categories: Category[] = [
  { id: 'cat-1', name: 'Audio', slug: 'audio', productCount: 12 },
  { id: 'cat-2', name: 'Keyboards', slug: 'keyboards', productCount: 8 },
  { id: 'cat-3', name: 'Monitors', slug: 'monitors', productCount: 6 },
  { id: 'cat-4', name: 'Laptops', slug: 'laptops', productCount: 14 },
  { id: 'cat-5', name: 'Accessories', slug: 'accessories', productCount: 21 },
  { id: 'cat-6', name: 'Storage', slug: 'storage', productCount: 9 },
];
