// Placeholder data for the homepage build — no backend wiring yet. Shaped to
// mirror the real API's fields (price_cents, category, etc.) so swapping to
// real fetches later is a data-source change, not a component rewrite.
import {
  Baby,
  BookOpen,
  Dumbbell,
  Gamepad2,
  Home,
  Shirt,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from 'lucide-solid';

export type DummyCategory = {
  id: number;
  name: string;
  icon: LucideIcon;
};

export const dummyCategories: DummyCategory[] = [
  { id: 1, name: 'Elektronik', icon: Smartphone },
  { id: 2, name: 'Fashion', icon: Shirt },
  { id: 3, name: 'Rumah Tangga', icon: Home },
  { id: 4, name: 'Buku & Alat Tulis', icon: BookOpen },
  { id: 5, name: 'Olahraga', icon: Dumbbell },
  { id: 6, name: 'Kecantikan', icon: Sparkles },
  { id: 7, name: 'Hobi & Mainan', icon: Gamepad2 },
  { id: 8, name: 'Ibu & Bayi', icon: Baby },
];

export type DummyProduct = {
  id: number;
  name: string;
  priceCents: number;
  originalPriceCents?: number;
  rating: number;
  soldLabel: string;
  location: string;
  freeShipping?: boolean;
  categoryId: number;
};

export const dummyProducts: DummyProduct[] = [
  {
    id: 1,
    name: 'Kemeja Flanel Lengan Panjang Pria',
    priceCents: 8990000,
    originalPriceCents: 14990000,
    rating: 4.8,
    soldLabel: '2rb+ terjual',
    location: 'Bandung',
    freeShipping: true,
    categoryId: 2,
  },
  {
    id: 2,
    name: 'Earphone Bluetooth TWS Noise Cancelling',
    priceCents: 12990000,
    originalPriceCents: 24990000,
    rating: 4.7,
    soldLabel: '5rb+ terjual',
    location: 'Jakarta Barat',
    freeShipping: true,
    categoryId: 1,
  },
  {
    id: 3,
    name: 'Rak Buku Minimalis 5 Susun',
    priceCents: 24990000,
    rating: 4.9,
    soldLabel: '890 terjual',
    location: 'Semarang',
    categoryId: 3,
    freeShipping: true,
  },
  {
    id: 4,
    name: 'Novel Fiksi Best Seller Nasional',
    priceCents: 8500000,
    originalPriceCents: 11000000,
    rating: 4.9,
    soldLabel: '1rb+ terjual',
    location: 'Yogyakarta',
    categoryId: 4,
  },
  {
    id: 5,
    name: 'Matras Yoga Anti Slip 10mm',
    priceCents: 6990000,
    rating: 4.6,
    soldLabel: '3rb+ terjual',
    location: 'Surabaya',
    freeShipping: true,
    categoryId: 5,
  },
  {
    id: 6,
    name: 'Serum Wajah Vitamin C 20ml',
    priceCents: 4990000,
    originalPriceCents: 7500000,
    rating: 4.7,
    soldLabel: '10rb+ terjual',
    location: 'Jakarta Selatan',
    freeShipping: true,
    categoryId: 6,
  },
  {
    id: 7,
    name: 'Action Figure Koleksi Limited Edition',
    priceCents: 34990000,
    rating: 4.8,
    soldLabel: '412 terjual',
    location: 'Tangerang',
    categoryId: 7,
  },
  {
    id: 8,
    name: 'Baby Carrier Ergonomis Multifungsi',
    priceCents: 18990000,
    originalPriceCents: 26990000,
    rating: 4.8,
    soldLabel: '1rb+ terjual',
    location: 'Bekasi',
    freeShipping: true,
    categoryId: 8,
  },
  {
    id: 9,
    name: 'Smartwatch Layar AMOLED 1.9"',
    priceCents: 45990000,
    originalPriceCents: 65990000,
    rating: 4.6,
    soldLabel: '3rb+ terjual',
    location: 'Depok',
    freeShipping: true,
    categoryId: 1,
  },
  {
    id: 10,
    name: 'Tas Selempang Kanvas Unisex',
    priceCents: 9990000,
    rating: 4.7,
    soldLabel: '2rb+ terjual',
    location: 'Malang',
    categoryId: 2,
  },
  {
    id: 11,
    name: 'Lampu Meja LED Dimmable',
    priceCents: 11500000,
    originalPriceCents: 16000000,
    rating: 4.5,
    soldLabel: '650 terjual',
    location: 'Solo',
    freeShipping: true,
    categoryId: 3,
  },
  {
    id: 12,
    name: 'Dumbbell Set Adjustable 20kg',
    priceCents: 32990000,
    rating: 4.9,
    soldLabel: '980 terjual',
    location: 'Jakarta Timur',
    categoryId: 5,
  },
];

export function discountPercent(product: DummyProduct): number | null {
  if (!product.originalPriceCents) return null;
  return Math.round(
    ((product.originalPriceCents - product.priceCents) / product.originalPriceCents) * 100,
  );
}
