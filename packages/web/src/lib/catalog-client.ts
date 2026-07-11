const baseUrl = import.meta.env.VITE_CATALOG_API_URL ?? 'http://localhost:8081';

// --- API wire types (snake_case, integer cents) ---

interface ApiImage {
  id: string;
  position: number;
  is_primary: boolean;
  url: string;
}

interface ApiVariant {
  id: string;
  sku: string;
  price_cents: number | null;
  attributes: Record<string, string>;
  display_stock: number;
}

interface ApiProduct {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  base_price_cents: number;
  display_stock: number;
  images?: ApiImage[];
  variants?: ApiVariant[];
}

interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  product_count: number;
}

// --- UI types (camelCase, prices in dollars for display) ---

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  price: number | null;
  attributes: Record<string, string>;
  stock: number;
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface ProductDetail extends Product {
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface ProductPage {
  items: Product[];
  nextCursor: string;
}

function toProduct(p: ApiProduct): Product {
  const primary =
    p.images?.find((img) => img.is_primary) ?? p.images?.[0] ?? null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    price: p.base_price_cents / 100,
    stock: p.display_stock,
    imageUrl: primary?.url,
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) {
    throw new Error(`Catalog API error (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCategories(): Promise<Category[]> {
  const data = await get<{ items: ApiCategory[] }>('/categories');
  return data.items.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: c.product_count,
  }));
}

export async function fetchProducts(params: {
  category?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}): Promise<ProductPage> {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.q) search.set('q', params.q);
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  const qs = search.toString();

  const data = await get<{ items: ApiProduct[]; next_cursor: string }>(
    `/products${qs ? `?${qs}` : ''}`,
  );
  return { items: data.items.map(toProduct), nextCursor: data.next_cursor };
}

export async function fetchProduct(slug: string): Promise<ProductDetail> {
  const p = await get<ApiProduct>(`/products/${encodeURIComponent(slug)}`);
  return {
    ...toProduct(p),
    variants: (p.variants ?? []).map((v) => ({
      id: v.id,
      sku: v.sku,
      price: v.price_cents === null ? null : v.price_cents / 100,
      attributes: v.attributes ?? {},
      stock: v.display_stock,
    })),
    images: (p.images ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      isPrimary: img.is_primary,
    })),
  };
}
