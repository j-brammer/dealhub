import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useWallet } from '@/context/WalletContext';

import { PrizeWheel } from './PrizeWheel';
import { useColorScheme } from './useColorScheme';

const BID_OPTIONS = [1, 5, 10] as const;
const JACKPOT_BASE = 100;
const WEDGE_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'];
const NON_JACKPOT_SEGMENTS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 5, 10, 25];

function shuffledSegments(jackpotValue: number): number[] {
  const arr = [...NON_JACKPOT_SEGMENTS, jackpotValue];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function replaceJackpotValue(list: number[], oldJackpot: number, newJackpot: number): number[] {
  const idx = list.findIndex((v) => v === oldJackpot);
  if (idx < 0) return list;
  const next = [...list];
  next[idx] = newJackpot;
  return next;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Closes the wheel and should navigate to Account (load credit lives there). */
  onGoAddCredit?: () => void;
};

export function CreditPrizeWheelModal({ visible, onClose, onGoAddCredit }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { storeCredit, hydrated, jackpotAmount, setJackpotAmount, addStoreCredit, deductStoreCredit } =
    useWallet();
  const [segments, setSegments] = useState<number[]>(() => shuffledSegments(jackpotAmount || JACKPOT_BASE));

  const [wheelKey, setWheelKey] = useState(0);
  const [spinTarget, setSpinTarget] = useState<number | null>(null);
  const [spinToken, setSpinToken] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'done'>('idle');
  const [isStartingSpin, setIsStartingSpin] = useState(false);
  const [landedIndex, setLandedIndex] = useState<number | null>(null);
  const [landedSpinToken, setLandedSpinToken] = useState<number | null>(null);
  const [selectedBid, setSelectedBid] = useState<(typeof BID_OPTIONS)[number]>(1);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [pendingSpin, setPendingSpin] = useState<{
    index: number;
    bid: number;
    segmentsSnapshot: number[];
    jackpotAtSpin: number;
    nextJackpot: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const [toastBg, setToastBg] = useState<string | null>(null);
  const [toastFg, setToastFg] = useState<string | null>(null);
  const toastOpacity = useMemo(() => new Animated.Value(0), []);

  const projected = useMemo(() => {
    if (!hydrated) return '...';
    return `$${storeCredit.toFixed(2)}`;
  }, [hydrated, storeCredit]);
  const displayJackpotValue = useMemo(() => jackpotAmount * selectedBid, [jackpotAmount, selectedBid]);
  const displaySegments = useMemo(
    () => segments.map((amt) => (amt > 0 ? amt * selectedBid : 0)),
    [segments, selectedBid]
  );

  const canAffordSpin = hydrated && storeCredit >= selectedBid;
  const creditShortfall = Math.max(0, selectedBid - storeCredit);

  const reset = useCallback(() => {
    setSpinTarget(null);
    setSpinToken(0);
    setPhase('idle');
    setIsStartingSpin(false);
    setLandedIndex(null);
    setLandedSpinToken(null);
    setBidModalOpen(false);
    setPendingSpin(null);
    setError(null);
    setToastText(null);
    setToastBg(null);
    setToastFg(null);
    toastOpacity.setValue(0);
    setSegments(shuffledSegments(jackpotAmount));
    setWheelKey((k) => k + 1);
  }, [jackpotAmount, toastOpacity]);

  useEffect(() => {
    if (!visible) return;
    setSegments(shuffledSegments(jackpotAmount));
    setWheelKey((k) => k + 1);
    setSpinTarget(null);
    setSpinToken(0);
    setPhase('idle');
    setIsStartingSpin(false);
    setLandedIndex(null);
    setLandedSpinToken(null);
    setBidModalOpen(false);
    setPendingSpin(null);
    setError(null);
    setToastText(null);
    setToastBg(null);
    setToastFg(null);
    toastOpacity.setValue(0);
  }, [visible, jackpotAmount, toastOpacity]);

  const pickSpinIndex = useCallback((sourceSegments: number[], sourceJackpot: number): number => {
    const jackpotIdx = sourceSegments.findIndex((v) => v === sourceJackpot);
    const nonJackpotIndexes = sourceSegments
      .map((v, i) => ({ v, i }))
      .filter((x) => x.v !== sourceJackpot)
      .map((x) => x.i);
    if (nonJackpotIndexes.length === 0) {
      return jackpotIdx >= 0 ? jackpotIdx : 0;
    }
    const roll = Math.random();
    if (roll < 0.035 && jackpotIdx >= 0) return jackpotIdx;
    return nonJackpotIndexes[Math.floor(Math.random() * nonJackpotIndexes.length)] ?? 0;
  }, []);

  const handleSpin = useCallback(async () => {
    if (phase === 'spinning' || isStartingSpin) return;
    setIsStartingSpin(true);
    setError(null);
    try {
      if (!hydrated) return;
      if (storeCredit < selectedBid) {
        setError(
          `You need at least $${selectedBid.toFixed(2)} credit to roll. Add store credit under Account → Load store credit.`
        );
        return;
      }
      await deductStoreCredit(selectedBid);
      const jackpotAtSpin = jackpotAmount;
      const segmentsSnapshot = [...segments];
      const nextJackpot = Math.round((jackpotAtSpin + selectedBid * 2) * 100) / 100;
      const idx = pickSpinIndex(segmentsSnapshot, jackpotAtSpin);
      setPendingSpin({ index: idx, bid: selectedBid, segmentsSnapshot, jackpotAtSpin, nextJackpot });
      setSpinTarget(idx);
      setSpinToken((t) => t + 1);
      setLandedIndex(null);
      setLandedSpinToken(null);
      setPhase('spinning');
    } finally {
      setIsStartingSpin(false);
    }
  }, [phase, isStartingSpin, hydrated, storeCredit, selectedBid, deductStoreCredit, pickSpinIndex, jackpotAmount, segments]);

  useEffect(() => {
    if (phase !== 'spinning' || pendingSpin == null || landedIndex == null || landedSpinToken !== spinToken) return;
    let cancelled = false;
    void (async () => {
      try {
        const rawAmount = pendingSpin.segmentsSnapshot[landedIndex] ?? 0;
        const bid = pendingSpin.bid;
        const amount = rawAmount > 0 ? rawAmount * bid : 0;
        await addStoreCredit(amount);
        if (cancelled) return;
        const wonJackpot = rawAmount === pendingSpin.jackpotAtSpin;
        setPendingSpin(null);
        setSpinTarget(null);
        setLandedIndex(null);
        setLandedSpinToken(null);
        const updatedJackpot = wonJackpot ? JACKPOT_BASE : pendingSpin.nextJackpot;
        await setJackpotAmount(updatedJackpot);
        if (cancelled) return;
        setSegments((prev) => replaceJackpotValue(prev, pendingSpin.jackpotAtSpin, updatedJackpot));
        if (amount > 0) {
          const landedColor = WEDGE_COLORS[landedIndex % WEDGE_COLORS.length] ?? c.banner;
          setToastText(`You won $${amount.toFixed(2)}`);
          setToastBg(landedColor ?? c.banner);
          setToastFg('#111111');
        } else {
          setToastText('Try again!');
          setToastBg('#DC2626');
          setToastFg('#111111');
        }
        toastOpacity.setValue(0);
        Animated.sequence([
          Animated.timing(toastOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.delay(760),
          Animated.timing(toastOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]).start(() => {
          if (cancelled) return;
          setToastText(null);
          setToastBg(null);
          setToastFg(null);
        });
        setPhase('done');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to settle spin.');
          setPhase('idle');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    phase,
    pendingSpin,
    landedIndex,
    landedSpinToken,
    spinToken,
    addStoreCredit,
    setJackpotAmount,
    c.banner,
    toastOpacity,
  ]);

  const handleSpinAnimationEnd = useCallback(
    (idx: number) => {
      if (phase !== 'spinning') return;
      setLandedIndex(idx);
      setLandedSpinToken(spinToken);
    },
    [phase, spinToken]
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => {
        if (phase !== 'spinning') {
          onClose();
          reset();
        }
      }}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.topMetaRow}>
            {onGoAddCredit ? (
              <Pressable
                onPress={onGoAddCredit}
                disabled={phase === 'spinning'}
                accessibilityRole="button"
                accessibilityLabel="Add credit"
                hitSlop={4}
                style={({ pressed }) => [
                  styles.addCreditCta,
                  {
                    backgroundColor: c.accent,
                    opacity: phase === 'spinning' ? 0.45 : pressed ? 0.88 : 1,
                  },
                ]}>
                <Text style={styles.addCreditCtaText}>Add credit</Text>
              </Pressable>
            ) : (
              <View style={styles.topMetaLeftSpacer} />
            )}
            <View style={styles.balanceMeta}>
              <Text style={[styles.balanceMetaLabel, { color: c.muted }]}>Balance</Text>
              <Text style={[styles.balanceMetaValue, { color: c.accent }]}>{projected}</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: c.text }]}>Spin for store credit</Text>

          <View style={styles.creditRow}>
            <Text style={[styles.creditLabel, { color: c.muted }]}>Current jackpot</Text>
            <Text style={[styles.creditValue, styles.jackpotValue]}>${displayJackpotValue.toFixed(2)}</Text>
          </View>
          {toastText ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.resultMiniModal, { opacity: toastOpacity, backgroundColor: toastBg ?? c.banner }]}>
              <Text style={[styles.resultMiniModalText, { color: toastFg ?? c.accent }]}>{toastText}</Text>
            </Animated.View>
          ) : null}

          <View style={styles.wheelBlock}>
            <View style={styles.pointerWrap} pointerEvents="none">
              <View style={[styles.pointer, { borderTopColor: c.accent }]} />
            </View>
            <PrizeWheel
              key={wheelKey}
              amounts={displaySegments}
              jackpotValue={displayJackpotValue}
              spinToIndex={spinTarget}
              spinToken={spinToken}
              onSpinAnimationEnd={handleSpinAnimationEnd}
            />
          </View>

          {error ? <Text style={[styles.error, { color: c.price }]}>{error}</Text> : null}

          {hydrated && !canAffordSpin && phase !== 'spinning' ? (
            <View style={[styles.insufficientBox, { borderColor: c.border, backgroundColor: c.banner }]}>
              <Text style={[styles.insufficientTitle, { color: c.text }]}>Not enough credit</Text>
              <Text style={[styles.insufficientSub, { color: c.muted }]}>
                This roll costs ${selectedBid.toFixed(2)}. You’re short ${creditShortfall.toFixed(2)}. Tap Add credit
                above, load balance on Account, then return here to spin.
              </Text>
            </View>
          ) : null}

          <View style={styles.rollRow}>
            <Pressable
              onPress={() => void handleSpin()}
              disabled={phase === 'spinning' || isStartingSpin || !canAffordSpin}
              style={({ pressed }) => [
                styles.primaryBtn,
                styles.primaryBtnMain,
                {
                  backgroundColor: c.accent,
                  opacity:
                    pressed || phase === 'spinning' || isStartingSpin || !canAffordSpin ? 0.55 : 1,
                },
              ]}>
              <Text style={styles.primaryBtnText}>
                {phase === 'spinning' || isStartingSpin ? 'Rolling...' : `Roll for $${selectedBid.toFixed(2)}`}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setBidModalOpen(true)}
              disabled={phase === 'spinning' || isStartingSpin}
              style={({ pressed }) => [
                styles.primaryBtn,
                styles.primaryBtnDrop,
                { backgroundColor: c.accent, opacity: pressed || phase === 'spinning' || isStartingSpin ? 0.86 : 1 },
              ]}>
              <Text style={styles.dropChevron}>Bid</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              if (phase === 'spinning') return;
              onClose();
              reset();
            }}
            style={styles.secondaryBtn}>
            <Text style={[styles.secondaryBtnText, { color: c.muted }]}>Close</Text>
          </Pressable>
        </View>
      </View>
      <Modal
        visible={bidModalOpen}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setBidModalOpen(false)}>
        <Pressable style={styles.bidModalBackdrop} onPress={() => setBidModalOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={[styles.bidModalCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.bidModalTitle, { color: c.text }]}>Select bid amount</Text>
            {BID_OPTIONS.map((b) => {
              const active = b === selectedBid;
              return (
                <Pressable
                  key={b}
                  onPress={() => {
                    setSelectedBid(b);
                    setBidModalOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.bidModalItem,
                    { backgroundColor: active ? c.banner : pressed ? c.background : 'transparent' },
                  ]}>
                  <Text style={[styles.bidModalItemText, { color: c.text }]}>{`$${b.toFixed(2)}`}</Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  topMetaRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  addCreditCta: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addCreditCtaText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  topMetaLeftSpacer: { minWidth: 1 },
  balanceMeta: { alignItems: 'flex-end' },
  balanceMetaLabel: { fontSize: 12, fontWeight: '700' },
  balanceMetaValue: { fontSize: 15, fontWeight: '900' },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  creditRow: { marginTop: 10, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  creditLabel: { fontSize: 13, fontWeight: '700' },
  creditValue: { fontSize: 20, fontWeight: '900' },
  jackpotValue: { color: '#16A34A' },
  wheelBlock: { marginTop: 12, marginBottom: 8, alignItems: 'center' },
  pointerWrap: { marginBottom: -6, zIndex: 2 },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
  },
  error: { marginTop: 10, fontSize: 14, fontWeight: '700' },
  insufficientBox: {
    width: '100%',
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  insufficientTitle: { fontSize: 16, fontWeight: '900' },
  insufficientSub: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  resultMiniModal: {
    position: 'absolute',
    top: 96,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 5,
  },
  resultMiniModalText: { fontSize: 13, fontWeight: '900' },
  rollRow: { width: '100%', marginTop: 14, flexDirection: 'row', gap: 8 },
  primaryBtn: {
    marginTop: 0,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnMain: { flex: 1 },
  primaryBtnDrop: { width: 52 },
  dropChevron: { color: '#fff', fontSize: 13, fontWeight: '900' },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  bidModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  bidModalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  bidModalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  bidModalItem: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  bidModalItemText: { fontSize: 16, fontWeight: '800' },
  secondaryBtn: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 8 },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
});
