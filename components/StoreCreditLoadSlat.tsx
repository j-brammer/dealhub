import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import FontAwesome from '@expo/vector-icons/FontAwesome';

import Colors from '@/constants/Colors';
import { useAccount, type AccountPaymentMethod } from '@/context/AccountContext';
import { useWallet } from '@/context/WalletContext';

import { useColorScheme } from './useColorScheme';

const LOAD_CREDIT_OPTIONS = [10, 25, 50] as const;

function cardDisplayLabel(m: AccountPaymentMethod): string {
  const d = m.cardNumber.replace(/\D/g, '');
  const last4 = d.length >= 4 ? d.slice(-4) : '••••';
  return `Card •••• ${last4}`;
}

/** Account-page slat for loading store credit from saved cards. */
export function StoreCreditLoadSlat() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const {
    hydrated: accountHydrated,
    paymentMethods,
    defaultPaymentId,
    hasPaymentMethod,
  } = useAccount();
  const { hydrated: walletHydrated, storeCredit, addStoreCredit } = useWallet();

  const [loadAmount, setLoadAmount] = useState<(typeof LOAD_CREDIT_OPTIONS)[number]>(25);
  const [loadCardId, setLoadCardId] = useState<string | null>(null);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!accountHydrated) return;
    const preferred =
      (defaultPaymentId && paymentMethods.some((m) => m.id === defaultPaymentId) ? defaultPaymentId : null) ??
      paymentMethods[0]?.id ??
      null;
    setLoadCardId(preferred);
  }, [accountHydrated, defaultPaymentId, paymentMethods]);

  const balanceLabel = useMemo(() => {
    if (!walletHydrated) return '…';
    return `$${storeCredit.toFixed(2)}`;
  }, [walletHydrated, storeCredit]);

  const handleLoad = useCallback(async () => {
    if (!walletHydrated || !accountHydrated || loadBusy) return;
    if (!loadCardId || !paymentMethods.some((m) => m.id === loadCardId)) {
      setLoadError('Select a saved card.');
      return;
    }
    setLoadBusy(true);
    setLoadError(null);
    setJustAdded(null);
    try {
      await new Promise((r) => setTimeout(r, 650));
      await addStoreCredit(loadAmount);
      setJustAdded(loadAmount);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not add credit.');
    } finally {
      setLoadBusy(false);
    }
  }, [
    walletHydrated,
    accountHydrated,
    loadBusy,
    loadCardId,
    loadAmount,
    paymentMethods,
    addStoreCredit,
  ]);

  if (!accountHydrated) {
    return null;
  }

  return (
    <View style={[styles.slat, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Load store credit"
        style={({ pressed }) => [styles.collapsibleHeader, { opacity: pressed ? 0.92 : 1 }]}>
        <FontAwesome name="plus-circle" size={18} color={c.accent} style={styles.headerIcon} />
        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, { color: c.text }]}>Load store credit</Text>
          {!expanded ? (
            <Text style={[styles.headerBalanceHint, { color: c.muted }]}>Balance {balanceLabel}</Text>
          ) : null}
        </View>
        <FontAwesome name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={c.muted} />
      </Pressable>

      {expanded ? (
        <>
          <View style={[styles.slatDivider, { backgroundColor: c.border }]} />

          <View style={styles.balanceRow}>
            <Text style={[styles.balanceLabel, { color: c.muted }]}>Available balance</Text>
            <Text style={[styles.balanceValue, { color: c.accent }]}>{balanceLabel}</Text>
          </View>

          {!hasPaymentMethod || paymentMethods.length === 0 ? (
            <Text style={[styles.hint, { color: c.text }]}>
              Add a payment method above, then choose an amount and card to load credit.
            </Text>
          ) : (
            <>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>Amount</Text>
              <View style={styles.amountRow}>
                {LOAD_CREDIT_OPTIONS.map((amt) => {
                  const active = amt === loadAmount;
                  return (
                    <Pressable
                      key={amt}
                      onPress={() => setLoadAmount(amt)}
                      disabled={loadBusy}
                      style={({ pressed }) => [
                        styles.amountChip,
                        {
                          borderColor: c.border,
                          backgroundColor: active ? c.banner : pressed ? c.background : 'transparent',
                        },
                      ]}>
                      <Text style={[styles.amountChipText, { color: c.text }]}>${amt}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: c.muted, marginTop: 14 }]}>Pay with</Text>
              <ScrollView style={styles.cardList} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {paymentMethods.map((m) => {
                  const active = m.id === loadCardId;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setLoadCardId(m.id)}
                      disabled={loadBusy}
                      style={({ pressed }) => [
                        styles.cardRow,
                        {
                          borderColor: active ? c.accent : c.border,
                          backgroundColor: pressed ? c.background : 'transparent',
                        },
                      ]}>
                      <Text style={[styles.cardRowText, { color: c.text }]}>{cardDisplayLabel(m)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {loadError ? <Text style={[styles.error, { color: c.price }]}>{loadError}</Text> : null}
              {justAdded != null ? (
                <Text style={[styles.success, { color: '#16A34A' }]}>
                  Added ${justAdded.toFixed(2)} to your balance.
                </Text>
              ) : null}

              <Pressable
                onPress={() => void handleLoad()}
                disabled={loadBusy || !loadCardId}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: c.accent,
                    opacity: loadBusy || !loadCardId ? 0.55 : pressed ? 0.9 : 1,
                  },
                ]}>
                {loadBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Add ${loadAmount} to balance</Text>
                )}
              </Pressable>
            </>
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slat: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  headerIcon: { width: 28 },
  headerTitles: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerBalanceHint: { fontSize: 13, fontWeight: '600', marginTop: 3 },
  slatDivider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  balanceLabel: { fontSize: 13, fontWeight: '700' },
  balanceValue: { fontSize: 20, fontWeight: '900' },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  amountChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  amountChipText: { fontSize: 15, fontWeight: '800' },
  cardList: { maxHeight: 160, marginTop: 8, paddingHorizontal: 16 },
  cardRow: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  cardRowText: { fontSize: 15, fontWeight: '700' },
  error: { fontSize: 13, fontWeight: '700', paddingHorizontal: 16, marginTop: 8 },
  success: { fontSize: 13, fontWeight: '700', paddingHorizontal: 16, marginTop: 8 },
  primaryBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
