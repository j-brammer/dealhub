import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useCatalog } from '@/context/CatalogContext';
import type { Product } from '@/data/products';

export type CartLine = {
  productId: string;
};

type CartContextValue = {
  lines: CartLine[];
  /** One unit per listing; if the item is already in the cart, this is a no-op. */
  addToCart: (productId: string) => void;
  removeLine: (productId: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  linesWithProduct: { line: CartLine; product: Product }[];
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { getProductById } = useCatalog();
  const [lines, setLines] = useState<CartLine[]>([]);

  const addToCart = useCallback((productId: string) => {
    setLines((prev) => {
      if (prev.some((l) => l.productId === productId)) return prev;
      return [...prev, { productId }];
    });
  }, []);

  const removeLine = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const linesWithProduct = lines
      .map((line) => {
        const product = getProductById(line.productId);
        return product ? { line, product } : null;
      })
      .filter(Boolean) as { line: CartLine; product: Product }[];

    const subtotal = linesWithProduct.reduce((sum, { product }) => sum + product.price, 0);
    const itemCount = lines.length;

    return {
      lines,
      addToCart,
      removeLine,
      clearCart,
      itemCount,
      subtotal,
      linesWithProduct,
    };
  }, [lines, addToCart, removeLine, clearCart, getProductById]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
