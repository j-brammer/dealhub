import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useCatalog } from '@/context/CatalogContext';
import type { Product } from '@/data/products';

export type CartLine = {
  productId: string;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  addToCart: (productId: string, quantity?: number) => void;
  removeLine: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  itemCount: number;
  subtotal: number;
  linesWithProduct: { line: CartLine; product: Product }[];
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { getProductById } = useCatalog();
  const [lines, setLines] = useState<CartLine[]>([]);

  const addToCart = useCallback((productId: string, quantity = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === productId);
      if (i === -1) return [...prev, { productId, quantity }];
      const next = [...prev];
      next[i] = { ...next[i], quantity: next[i].quantity + quantity };
      return next;
    });
  }, []);

  const removeLine = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      setLines((prev) => prev.filter((l) => l.productId !== productId));
      return;
    }
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === productId);
      if (i === -1) return prev;
      const next = [...prev];
      next[i] = { ...next[i], quantity };
      return next;
    });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const linesWithProduct = lines
      .map((line) => {
        const product = getProductById(line.productId);
        return product ? { line, product } : null;
      })
      .filter(Boolean) as { line: CartLine; product: Product }[];

    const subtotal = linesWithProduct.reduce(
      (sum, { line, product }) => sum + product.price * line.quantity,
      0
    );
    const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

    return {
      lines,
      addToCart,
      removeLine,
      setQuantity,
      itemCount,
      subtotal,
      linesWithProduct,
    };
  }, [lines, addToCart, removeLine, setQuantity, getProductById]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
