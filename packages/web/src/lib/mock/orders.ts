export type OrderStatus =
  'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  placedAt: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
}

export const orders: Order[] = [
  {
    id: 'ord-1001',
    placedAt: '2026-06-28',
    status: 'delivered',
    items: [
      {
        productId: 'prod-1',
        name: 'Aurora Mechanical Keyboard',
        quantity: 1,
        price: 129.99,
      },
      {
        productId: 'prod-8',
        name: 'Sable Wireless Mouse',
        quantity: 1,
        price: 49.99,
      },
    ],
    total: 179.98,
  },
  {
    id: 'ord-1002',
    placedAt: '2026-07-01',
    status: 'shipped',
    items: [
      {
        productId: 'prod-3',
        name: 'ClearView 27" Monitor',
        quantity: 1,
        price: 299.0,
      },
    ],
    total: 299.0,
  },
  {
    id: 'ord-1003',
    placedAt: '2026-07-03',
    status: 'processing',
    items: [
      {
        productId: 'prod-6',
        name: 'Terra 1TB NVMe SSD',
        quantity: 2,
        price: 79.99,
      },
    ],
    total: 159.98,
  },
  {
    id: 'ord-1004',
    placedAt: '2026-07-05',
    status: 'pending',
    items: [
      {
        productId: 'prod-2',
        name: 'Nimbus Wireless Headphones',
        quantity: 1,
        price: 89.5,
      },
    ],
    total: 89.5,
  },
  {
    id: 'ord-1005',
    placedAt: '2026-06-15',
    status: 'cancelled',
    items: [
      { productId: 'prod-7', name: 'Halo Desk Lamp', quantity: 1, price: 34.5 },
    ],
    total: 34.5,
  },
];
