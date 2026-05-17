import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { inferShippingOptionIdFromOrder, type ShippingOptionId } from '@/data/shippingOptions';
import { syncOrderDeliveryNotifications } from '@/lib/deliveryNotifications';
import { computeExpectedDeliveryIso, legacyExpectedDeliveryAt } from '@/lib/expectedDelivery';

const STORAGE_ORDERS = 'dealhub_orders_v1';

export type SavedOrderLine = {
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
};

export type SavedOrder = {
  id: string;
  placedAt: string;
  lines: SavedOrderLine[];
  subtotal: number;
  shippingTitle: string;
  shippingFee: number;
  shippingOptionId: ShippingOptionId;
  /** When the order is treated as delivered (randomized at checkout from the shipping method window). */
  expectedDeliveryAt: string;
  storeCreditApplied: number;
  total: number;
  /** Ship / delivery / payment summary (no total line). */
  noteLines: string[];
};

type OrdersContextValue = {
  hydrated: boolean;
  orders: SavedOrder[];
  addOrder: (order: Omit<SavedOrder, 'id' | 'placedAt' | 'expectedDeliveryAt'>) => Promise<void>;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [orders, setOrders] = useState<SavedOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_ORDERS);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as unknown[];
          if (!Array.isArray(parsed)) {
            setOrders([]);
          } else {
            let migrated = false;
            const normalized: SavedOrder[] = parsed.map((row) => {
              const o = row as Partial<SavedOrder>;
              const shippingOptionId =
                o.shippingOptionId ?? inferShippingOptionIdFromOrder(o.shippingTitle, o.shippingFee ?? 0);
              let expectedDeliveryAt = o.expectedDeliveryAt;
              if (!expectedDeliveryAt && o.placedAt) {
                migrated = true;
                expectedDeliveryAt = legacyExpectedDeliveryAt(o.placedAt, shippingOptionId);
              } else if (!expectedDeliveryAt) {
                migrated = true;
                expectedDeliveryAt = legacyExpectedDeliveryAt(new Date().toISOString(), shippingOptionId);
              }
              if (!o.shippingOptionId || !o.expectedDeliveryAt) migrated = true;
              return {
                ...o,
                id: o.id ?? randomId(),
                placedAt: o.placedAt ?? new Date().toISOString(),
                lines: Array.isArray(o.lines) ? o.lines : [],
                subtotal: typeof o.subtotal === 'number' ? o.subtotal : 0,
                shippingTitle: o.shippingTitle ?? '',
                shippingFee: typeof o.shippingFee === 'number' ? o.shippingFee : 0,
                shippingOptionId,
                expectedDeliveryAt,
                storeCreditApplied: typeof o.storeCreditApplied === 'number' ? o.storeCreditApplied : 0,
                total: typeof o.total === 'number' ? o.total : 0,
                noteLines: Array.isArray(o.noteLines) ? o.noteLines : [],
              } as SavedOrder;
            });
            setOrders(normalized);
            if (migrated) {
              await AsyncStorage.setItem(STORAGE_ORDERS, JSON.stringify(normalized));
            }
          }
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void syncOrderDeliveryNotifications(orders);
  }, [hydrated, orders]);

  const addOrder = useCallback(async (payload: Omit<SavedOrder, 'id' | 'placedAt' | 'expectedDeliveryAt'>) => {
    const placedAt = new Date();
    const entry: SavedOrder = {
      ...payload,
      id: randomId(),
      placedAt: placedAt.toISOString(),
      expectedDeliveryAt: computeExpectedDeliveryIso(placedAt, payload.shippingOptionId),
    };
    let next: SavedOrder[] = [];
    setOrders((prev) => {
      next = [entry, ...prev];
      return next;
    });
    await AsyncStorage.setItem(STORAGE_ORDERS, JSON.stringify(next));
  }, []);

  const value = useMemo<OrdersContextValue>(
    () => ({
      hydrated,
      orders,
      addOrder,
    }),
    [hydrated, orders, addOrder]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used within OrdersProvider');
  return ctx;
}
