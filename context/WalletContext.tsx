import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_CREDIT = 'dealhub_store_credit';
const STORAGE_SPIN_DAY = 'dealhub_wheel_spin_day';

export function localCalendarDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type WalletContextValue = {
  hydrated: boolean;
  storeCredit: number;
  lastWheelSpinDay: string | null;
  /** True if the user has not completed a wheel spin today (local calendar). */
  canSpinWheelToday: boolean;
  addStoreCredit: (amount: number) => Promise<void>;
  deductStoreCredit: (amount: number) => Promise<void>;
  claimWheelPrize: (amount: number) => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

async function readNumber(key: string, fallback: number): Promise<number> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}

async function readString(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [storeCredit, setStoreCredit] = useState(0);
  const [lastWheelSpinDay, setLastWheelSpinDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [credit, spinDay] = await Promise.all([
          readNumber(STORAGE_CREDIT, 0),
          readString(STORAGE_SPIN_DAY),
        ]);
        if (!cancelled) {
          setStoreCredit(credit);
          setLastWheelSpinDay(spinDay);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addStoreCredit = useCallback(async (amount: number) => {
    const add = Math.max(0, amount);
    setStoreCredit((prev) => {
      const next = prev + add;
      void AsyncStorage.setItem(STORAGE_CREDIT, String(next));
      return next;
    });
  }, []);

  const deductStoreCredit = useCallback(async (amount: number) => {
    const sub = Math.max(0, amount);
    setStoreCredit((prev) => {
      const next = Math.max(0, prev - sub);
      void AsyncStorage.setItem(STORAGE_CREDIT, String(next));
      return next;
    });
  }, []);

  const claimWheelPrize = useCallback(async (amount: number) => {
    const day = localCalendarDay();
    const add = Math.max(0, amount);
    setStoreCredit((prev) => {
      const next = prev + add;
      void AsyncStorage.setItem(STORAGE_CREDIT, String(next));
      return next;
    });
    setLastWheelSpinDay(day);
    await AsyncStorage.setItem(STORAGE_SPIN_DAY, day);
  }, []);

  const canSpinWheelToday = lastWheelSpinDay !== localCalendarDay();

  const value = useMemo<WalletContextValue>(
    () => ({
      hydrated,
      storeCredit,
      lastWheelSpinDay,
      canSpinWheelToday,
      addStoreCredit,
      deductStoreCredit,
      claimWheelPrize,
    }),
    [
      hydrated,
      storeCredit,
      lastWheelSpinDay,
      canSpinWheelToday,
      addStoreCredit,
      deductStoreCredit,
      claimWheelPrize,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
