import * as React from 'react';

import type { Product } from '@/lib/catalog-client';

export interface CartLine {
  product: Product;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<CartLine[]>([]);

  const addItem = React.useCallback((product: Product) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeItem = React.useCallback((productId: string) => {
    setLines((prev) => prev.filter((line) => line.product.id !== productId));
  }, []);

  const setQuantity = React.useCallback(
    (productId: string, quantity: number) => {
      setLines((prev) =>
        quantity <= 0
          ? prev.filter((line) => line.product.id !== productId)
          : prev.map((line) =>
              line.product.id === productId ? { ...line, quantity } : line,
            ),
      );
    },
    [],
  );

  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <CartContext.Provider
      value={{ lines, addItem, removeItem, setQuantity, subtotal, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
