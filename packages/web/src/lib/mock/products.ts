export interface Product {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  price: number;
  rating: number;
  stock: number;
  description: string;
}

export const products: Product[] = [
  {
    id: 'prod-1',
    slug: 'aurora-mechanical-keyboard',
    name: 'Aurora Mechanical Keyboard',
    categorySlug: 'keyboards',
    price: 129.99,
    rating: 4.6,
    stock: 24,
    description:
      'Hot-swappable mechanical keyboard with per-key RGB and a machined aluminum frame.',
  },
  {
    id: 'prod-2',
    slug: 'nimbus-wireless-headphones',
    name: 'Nimbus Wireless Headphones',
    categorySlug: 'audio',
    price: 89.5,
    rating: 4.3,
    stock: 40,
    description:
      'Over-ear ANC headphones with 30-hour battery life and multipoint pairing.',
  },
  {
    id: 'prod-3',
    slug: 'clearview-27-monitor',
    name: 'ClearView 27" Monitor',
    categorySlug: 'monitors',
    price: 299.0,
    rating: 4.7,
    stock: 15,
    description:
      '27" QHD IPS panel, 144Hz refresh rate, USB-C 90W passthrough.',
  },
  {
    id: 'prod-4',
    slug: 'voyager-14-laptop',
    name: 'Voyager 14 Laptop',
    categorySlug: 'laptops',
    price: 1199.0,
    rating: 4.4,
    stock: 8,
    description:
      '14" laptop, 16GB RAM, 1TB SSD — built for developers on the move.',
  },
  {
    id: 'prod-5',
    slug: 'driftwood-desk-mat',
    name: 'Driftwood Desk Mat',
    categorySlug: 'accessories',
    price: 24.0,
    rating: 4.1,
    stock: 60,
    description: 'Stitched-edge desk mat, 900x400mm, water-resistant surface.',
  },
  {
    id: 'prod-6',
    slug: 'terra-1tb-nvme-ssd',
    name: 'Terra 1TB NVMe SSD',
    categorySlug: 'storage',
    price: 79.99,
    rating: 4.8,
    stock: 33,
    description: 'PCIe Gen4 NVMe SSD, 7000MB/s read, 5-year warranty.',
  },
  {
    id: 'prod-7',
    slug: 'halo-desk-lamp',
    name: 'Halo Desk Lamp',
    categorySlug: 'accessories',
    price: 34.5,
    rating: 4.0,
    stock: 45,
    description:
      'Adjustable color-temperature LED lamp with USB-C charging port.',
  },
  {
    id: 'prod-8',
    slug: 'sable-wireless-mouse',
    name: 'Sable Wireless Mouse',
    categorySlug: 'accessories',
    price: 49.99,
    rating: 4.5,
    stock: 52,
    description: 'Ergonomic wireless mouse with 4000 DPI optical sensor.',
  },
];
