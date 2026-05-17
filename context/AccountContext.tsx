import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_ACCOUNT_PROFILE = 'dealhub_account_profile_v1';
const STORAGE_ACCOUNT_ADDRESS_LEGACY = 'dealhub_account_address_v1';
const STORAGE_ACCOUNT_ADDRESSES = 'dealhub_account_addresses_v2';
/** @deprecated Migrated into STORAGE_ACCOUNT_PAYMENTS_V2 */
const STORAGE_ACCOUNT_PAYMENT = 'dealhub_account_payment_v1';
const STORAGE_ACCOUNT_PAYMENTS_V2 = 'dealhub_account_payments_v2';

export type AccountProfile = {
  email: string;
  firstName: string;
  lastName: string;
  avatarUri: string | null;
};

/** One saved shipping destination (e.g. home, family). */
export type AccountAddressEntry = {
  id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

/** Input shape when adding/updating payment (full PAN accepted; only masked + last4 persisted). */
export type AccountPayment = {
  cardNumber: string;
  expiration: string;
  cvv: string;
};

export type AccountPaymentMethod = AccountPayment & { id: string };

type PaymentWallet = {
  paymentMethods: AccountPaymentMethod[];
  defaultPaymentId: string | null;
};

type AddressBookPersisted = {
  addresses: AccountAddressEntry[];
  defaultAddressId: string | null;
};

type AccountContextValue = {
  hydrated: boolean;
  profile: AccountProfile | null;
  addresses: AccountAddressEntry[];
  defaultAddressId: string | null;
  defaultAddress: AccountAddressEntry | null;
  /** @deprecated Use defaultAddress or addresses — kept for quick compatibility */
  address: AccountAddressEntry | null;
  paymentMethods: AccountPaymentMethod[];
  defaultPaymentId: string | null;
  /** Default or first saved card — compatibility for account screen. */
  payment: AccountPayment | null;
  /** True when at least one saved card with last4 exists. */
  hasPaymentMethod: boolean;
  isSignedIn: boolean;
  hasAddress: boolean;
  setProfile: (next: AccountProfile | null) => Promise<void>;
  setAvatarUri: (uri: string | null) => Promise<void>;
  setDefaultAddressId: (id: string | null) => Promise<void>;
  addAddress: (fields: Omit<AccountAddressEntry, 'id'>) => Promise<string>;
  updateAddress: (id: string, fields: Partial<Omit<AccountAddressEntry, 'id'>>) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  /** Clears wallet, or updates the default card’s stored fields. */
  setPayment: (next: AccountPayment | null) => Promise<void>;
  /** Appends a saved card. `makeDefault` defaults to true. */
  addPaymentMethod: (next: AccountPayment, options?: { makeDefault?: boolean }) => Promise<string>;
  setDefaultPaymentId: (id: string | null) => Promise<void>;
  updatePaymentMethod: (id: string, next: AccountPayment) => Promise<void>;
  removePaymentMethod: (id: string) => Promise<void>;
  cardLast4: string;
};

const AccountContext = createContext<AccountContextValue | null>(null);

function sanitizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function maskStoredCardNumber(value: string): string {
  const digits = sanitizeDigits(value);
  const last4 = digits.length >= 4 ? digits.slice(-4) : '';
  return last4 ? `**** **** **** ${last4}` : '';
}

function normalizeStoredPayment(next: AccountPayment): AccountPayment {
  return {
    ...next,
    cardNumber: maskStoredCardNumber(next.cardNumber),
    cvv: sanitizeDigits(next.cvv),
  };
}

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function persistAddressBook(book: AddressBookPersisted): Promise<void> {
  return AsyncStorage.setItem(STORAGE_ACCOUNT_ADDRESSES, JSON.stringify(book));
}

function persistWallet(wallet: PaymentWallet): Promise<void> {
  return AsyncStorage.setItem(STORAGE_ACCOUNT_PAYMENTS_V2, JSON.stringify(wallet));
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfileState] = useState<AccountProfile | null>(null);
  const [addressBook, setAddressBookState] = useState<AddressBookPersisted>({
    addresses: [],
    defaultAddressId: null,
  });
  const [wallet, setWalletState] = useState<PaymentWallet>({
    paymentMethods: [],
    defaultPaymentId: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileRaw, addressesRaw, legacyAddressRaw, paymentRaw, paymentsV2Raw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_ACCOUNT_PROFILE),
          AsyncStorage.getItem(STORAGE_ACCOUNT_ADDRESSES),
          AsyncStorage.getItem(STORAGE_ACCOUNT_ADDRESS_LEGACY),
          AsyncStorage.getItem(STORAGE_ACCOUNT_PAYMENT),
          AsyncStorage.getItem(STORAGE_ACCOUNT_PAYMENTS_V2),
        ]);
        if (cancelled) return;
        setProfileState(profileRaw ? (JSON.parse(profileRaw) as AccountProfile) : null);

        let initialWallet: PaymentWallet = { paymentMethods: [], defaultPaymentId: null };
        if (paymentsV2Raw) {
          try {
            const parsed = JSON.parse(paymentsV2Raw) as PaymentWallet;
            if (Array.isArray(parsed?.paymentMethods)) {
              initialWallet = {
                paymentMethods: parsed.paymentMethods,
                defaultPaymentId: parsed.defaultPaymentId ?? null,
              };
            }
          } catch {
            initialWallet = { paymentMethods: [], defaultPaymentId: null };
          }
        } else if (paymentRaw) {
          try {
            const legacy = JSON.parse(paymentRaw) as AccountPayment;
            const normalized = normalizeStoredPayment(legacy);
            const id = randomId();
            const method: AccountPaymentMethod = { id, ...normalized };
            initialWallet = { paymentMethods: [method], defaultPaymentId: id };
            await persistWallet(initialWallet);
            await AsyncStorage.removeItem(STORAGE_ACCOUNT_PAYMENT);
          } catch {
            initialWallet = { paymentMethods: [], defaultPaymentId: null };
          }
        }
        setWalletState(initialWallet);

        let book: AddressBookPersisted = { addresses: [], defaultAddressId: null };
        if (addressesRaw) {
          try {
            const parsed = JSON.parse(addressesRaw) as AddressBookPersisted;
            if (Array.isArray(parsed?.addresses)) {
              book = {
                addresses: parsed.addresses,
                defaultAddressId: parsed.defaultAddressId ?? null,
              };
            }
          } catch {
            book = { addresses: [], defaultAddressId: null };
          }
        } else if (legacyAddressRaw) {
          try {
            const legacy = JSON.parse(legacyAddressRaw) as Omit<AccountAddressEntry, 'id' | 'label'>;
            if (legacy?.line1) {
              const id = randomId();
              book = {
                addresses: [
                  {
                    id,
                    label: 'Home',
                    line1: legacy.line1 ?? '',
                    line2: legacy.line2 ?? '',
                    city: legacy.city ?? '',
                    state: legacy.state ?? '',
                    postalCode: legacy.postalCode ?? '',
                  },
                ],
                defaultAddressId: id,
              };
              await persistAddressBook(book);
            }
          } catch {
            // ignore
          }
          await AsyncStorage.removeItem(STORAGE_ACCOUNT_ADDRESS_LEGACY);
        }
        setAddressBookState(book);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setProfile = useCallback(async (next: AccountProfile | null) => {
    setProfileState(next);
    if (next) {
      await AsyncStorage.setItem(STORAGE_ACCOUNT_PROFILE, JSON.stringify(next));
    } else {
      await AsyncStorage.removeItem(STORAGE_ACCOUNT_PROFILE);
    }
  }, []);

  const setAvatarUri = useCallback(async (uri: string | null) => {
    setProfileState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, avatarUri: uri };
      void AsyncStorage.setItem(STORAGE_ACCOUNT_PROFILE, JSON.stringify(next));
      return next;
    });
  }, []);

  const setDefaultAddressId = useCallback(async (id: string | null) => {
    setAddressBookState((prev) => {
      const next = { ...prev, defaultAddressId: id };
      void persistAddressBook(next);
      return next;
    });
  }, []);

  const addAddress = useCallback(async (fields: Omit<AccountAddressEntry, 'id'>): Promise<string> => {
    const id = randomId();
    const entry: AccountAddressEntry = { id, ...fields };
    setAddressBookState((prev) => {
      const nextAddrs = [...prev.addresses, entry];
      const nextDefault =
        prev.defaultAddressId && prev.addresses.some((a) => a.id === prev.defaultAddressId)
          ? prev.defaultAddressId
          : id;
      const next = { addresses: nextAddrs, defaultAddressId: nextDefault };
      void persistAddressBook(next);
      return next;
    });
    return id;
  }, []);

  const updateAddress = useCallback(async (id: string, fields: Partial<Omit<AccountAddressEntry, 'id'>>) => {
    setAddressBookState((prev) => {
      const nextAddrs = prev.addresses.map((a) => (a.id === id ? { ...a, ...fields } : a));
      const next = { ...prev, addresses: nextAddrs };
      void persistAddressBook(next);
      return next;
    });
  }, []);

  const removeAddress = useCallback(async (id: string) => {
    setAddressBookState((prev) => {
      const nextAddrs = prev.addresses.filter((a) => a.id !== id);
      let nextDefault = prev.defaultAddressId;
      if (nextDefault === id) {
        nextDefault = nextAddrs[0]?.id ?? null;
      }
      const next = { addresses: nextAddrs, defaultAddressId: nextDefault };
      void persistAddressBook(next);
      return next;
    });
  }, []);

  const setDefaultPaymentId = useCallback(async (id: string | null) => {
    setWalletState((prev) => {
      const next: PaymentWallet = { ...prev, defaultPaymentId: id };
      void persistWallet(next);
      return next;
    });
  }, []);

  const addPaymentMethod = useCallback(async (next: AccountPayment, options?: { makeDefault?: boolean }) => {
    const id = randomId();
    const normalized = normalizeStoredPayment(next);
    const method: AccountPaymentMethod = { id, ...normalized };
    setWalletState((prev) => {
      const methods = [...prev.paymentMethods, method];
      const makeDefault = options?.makeDefault !== false;
      const defaultPaymentId = makeDefault ? id : prev.defaultPaymentId ?? id;
      const w: PaymentWallet = { paymentMethods: methods, defaultPaymentId };
      void persistWallet(w);
      return w;
    });
    return id;
  }, []);

  const updatePaymentMethod = useCallback(async (id: string, next: AccountPayment) => {
    const normalized = normalizeStoredPayment(next);
    setWalletState((prev) => {
      const idx = prev.paymentMethods.findIndex((m) => m.id === id);
      if (idx < 0) return prev;
      const methods = [...prev.paymentMethods];
      methods[idx] = { id, ...normalized };
      const w: PaymentWallet = { ...prev, paymentMethods: methods };
      void persistWallet(w);
      return w;
    });
  }, []);

  const removePaymentMethod = useCallback(async (id: string) => {
    setWalletState((prev) => {
      const nextMethods = prev.paymentMethods.filter((m) => m.id !== id);
      let nextDefault = prev.defaultPaymentId;
      if (nextDefault === id) {
        nextDefault = nextMethods[0]?.id ?? null;
      }
      const w: PaymentWallet = { paymentMethods: nextMethods, defaultPaymentId: nextDefault };
      void persistWallet(w);
      return w;
    });
  }, []);

  const setPayment = useCallback(async (next: AccountPayment | null) => {
    if (!next) {
      const empty: PaymentWallet = { paymentMethods: [], defaultPaymentId: null };
      setWalletState(empty);
      await persistWallet(empty);
      await AsyncStorage.removeItem(STORAGE_ACCOUNT_PAYMENT);
      return;
    }
    const fields = normalizeStoredPayment(next);
    setWalletState((w) => {
      let defId = w.defaultPaymentId ?? w.paymentMethods[0]?.id;
      if (!defId) {
        const id = randomId();
        const m: AccountPaymentMethod = { id, ...fields };
        const wallet: PaymentWallet = { paymentMethods: [m], defaultPaymentId: id };
        void persistWallet(wallet);
        return wallet;
      }
      const idx = w.paymentMethods.findIndex((m) => m.id === defId);
      let methods: AccountPaymentMethod[];
      if (idx >= 0) {
        methods = [...w.paymentMethods];
        methods[idx] = { id: defId, ...fields };
      } else {
        const id = randomId();
        methods = [...w.paymentMethods, { id, ...fields }];
        defId = id;
      }
      const wallet: PaymentWallet = { paymentMethods: methods, defaultPaymentId: defId };
      void persistWallet(wallet);
      return wallet;
    });
  }, []);

  const payment = useMemo(() => {
    const { paymentMethods, defaultPaymentId } = wallet;
    if (!paymentMethods.length) return null;
    const byDef = defaultPaymentId ? paymentMethods.find((m) => m.id === defaultPaymentId) : null;
    return byDef ?? paymentMethods[0] ?? null;
  }, [wallet]);

  const cardLast4 = useMemo(() => {
    const digits = sanitizeDigits(payment?.cardNumber ?? '');
    return digits.length >= 4 ? digits.slice(-4) : '';
  }, [payment?.cardNumber]);

  const defaultAddress = useMemo(() => {
    const { addresses, defaultAddressId } = addressBook;
    if (!addresses.length) return null;
    const byDefault = defaultAddressId ? addresses.find((a) => a.id === defaultAddressId) : null;
    return byDefault ?? addresses[0] ?? null;
  }, [addressBook]);

  const hasAddress = useMemo(
    () => addressBook.addresses.some((a) => Boolean(a.line1?.trim())),
    [addressBook.addresses]
  );

  const hasPaymentMethod = useMemo(
    () =>
      wallet.paymentMethods.some((m) => sanitizeDigits(m.cardNumber ?? '').length >= 4),
    [wallet.paymentMethods]
  );

  const value = useMemo<AccountContextValue>(
    () => ({
      hydrated,
      profile,
      addresses: addressBook.addresses,
      defaultAddressId: addressBook.defaultAddressId,
      defaultAddress,
      address: defaultAddress,
      paymentMethods: wallet.paymentMethods,
      defaultPaymentId: wallet.defaultPaymentId,
      payment,
      hasPaymentMethod,
      isSignedIn: Boolean(profile?.email && profile?.firstName && profile?.lastName),
      hasAddress,
      setProfile,
      setAvatarUri,
      setDefaultAddressId,
      addAddress,
      updateAddress,
      removeAddress,
      setPayment,
      addPaymentMethod,
      setDefaultPaymentId,
      updatePaymentMethod,
      removePaymentMethod,
      cardLast4,
    }),
    [
      hydrated,
      profile,
      addressBook.addresses,
      addressBook.defaultAddressId,
      defaultAddress,
      wallet.paymentMethods,
      wallet.defaultPaymentId,
      payment,
      hasPaymentMethod,
      hasAddress,
      setProfile,
      setAvatarUri,
      setDefaultAddressId,
      addAddress,
      updateAddress,
      removeAddress,
      setPayment,
      addPaymentMethod,
      setDefaultPaymentId,
      updatePaymentMethod,
      removePaymentMethod,
      cardLast4,
    ]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used within AccountProvider');
  return ctx;
}
