import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_CREDIT = 'dealhub_store_credit';
const STORAGE_SPIN_DAY = 'dealhub_wheel_spin_day';
const STORAGE_JACKPOT = 'dealhub_progressive_jackpot';
const DEFAULT_JACKPOT = 100;

export function localCalendarDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type WalletContextValue = {
  hydrated: boolean;
  storeCredit: number;
  jackpotAmount: number;
  lastWheelSpinDay: string | null;
  /** True if the user has not completed a wheel spin today (local calendar). */
  canSpinWheelToday: boolean;
  addStoreCredit: (amount: number) => Promise<void>;
  deductStoreCredit: (amount: number) => Promise<void>;
  setJackpotAmount: (amount: number) => Promise<void>;
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
  const [jackpotAmount, setJackpotAmountState] = useState(DEFAULT_JACKPOT);
  const [lastWheelSpinDay, setLastWheelSpinDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [credit, jackpot, spinDay] = await Promise.all([
          readNumber(STORAGE_CREDIT, 0),
          readNumber(STORAGE_JACKPOT, DEFAULT_JACKPOT),
          readString(STORAGE_SPIN_DAY),
        ]);
        if (!cancelled) {
          setStoreCredit(credit);
          setJackpotAmountState(jackpot);
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

  const setJackpotAmount = useCallback(async (amount: number) => {
    const next = Math.max(0, amount);
    setJackpotAmountState(next);
    await AsyncStorage.setItem(STORAGE_JACKPOT, String(next));
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
      jackpotAmount,
      lastWheelSpinDay,
      canSpinWheelToday,
      addStoreCredit,
      deductStoreCredit,
      setJackpotAmount,
      claimWheelPrize,
    }),
    [
      hydrated,
      storeCredit,
      jackpotAmount,
      lastWheelSpinDay,
      canSpinWheelToday,
      addStoreCredit,
      deductStoreCredit,
      setJackpotAmount,
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
