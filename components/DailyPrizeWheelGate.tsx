import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useWallet } from '@/context/WalletContext';

import { PrizeWheel } from './PrizeWheel';
import { useColorScheme } from './useColorScheme';

const SEGMENT_COUNT = 8;

function randomSegments(): number[] {
  return Array.from({ length: SEGMENT_COUNT }, () => 1 + Math.floor(Math.random() * 100));
}

export function DailyPrizeWheelGate() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { hydrated, canSpinWheelToday, claimWheelPrize } = useWallet();

  const [visible, setVisible] = useState(false);
  const [segments, setSegments] = useState<number[]>(() => randomSegments());
  const [wheelKey, setWheelKey] = useState(0);
  const [spinTarget, setSpinTarget] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'done'>('idle');
  const [wonAmount, setWonAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!hydrated || !canSpinWheelToday) {
      setVisible(false);
      return;
    }

    const delayMs = 400 + Math.random() * 1800;
    const id = setTimeout(() => {
      setSegments(randomSegments());
      setWheelKey((k) => k + 1);
      setSpinTarget(null);
      setPhase('idle');
      setWonAmount(null);
      setVisible(true);
    }, delayMs);

    return () => clearTimeout(id);
  }, [hydrated, canSpinWheelToday]);

  const onSpinAnimationEnd = useCallback(() => {
    setPhase('done');
  }, []);

  const handleSpin = () => {
    if (phase !== 'idle') return;
    const idx = Math.floor(Math.random() * SEGMENT_COUNT);
    setWonAmount(segments[idx] ?? 0);
    setSpinTarget(idx);
    setPhase('spinning');
  };

  const handleClaim = async () => {
    if (wonAmount == null) return;
    await claimWheelPrize(wonAmount);
    setVisible(false);
    setPhase('idle');
    setSpinTarget(null);
    setWonAmount(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => {
        /* Forced flow: complete spin + claim, or wait until tomorrow */
      }}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.badge, { backgroundColor: c.banner }]}>
            <Text style={[styles.badgeText, { color: c.accent }]}>Limited reward</Text>
          </View>
          <Text style={[styles.title, { color: c.text }]}>Spin for free store credit</Text>
          <Text style={[styles.sub, { color: c.muted }]}>
            One spin per day. Prizes up to $100 — use your balance at checkout.
          </Text>

          <View style={styles.wheelBlock}>
            <View style={styles.pointerWrap} pointerEvents="none">
              <View style={[styles.pointer, { borderBottomColor: c.accent }]} />
            </View>
            <PrizeWheel
              key={wheelKey}
              amounts={segments}
              spinToIndex={spinTarget}
              onSpinAnimationEnd={onSpinAnimationEnd}
            />
          </View>

          {phase === 'idle' ? (
            <Pressable
              onPress={handleSpin}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: c.accent, opacity: pressed ? 0.9 : 1 },
              ]}>
              <Text style={styles.primaryBtnText}>Spin the wheel</Text>
            </Pressable>
          ) : null}

          {phase === 'spinning' ? (
            <Text style={[styles.status, { color: c.muted }]}>Spinning…</Text>
          ) : null}

          {phase === 'done' && wonAmount != null ? (
            <View style={styles.resultBlock}>
              <Text style={[styles.winTitle, { color: c.text }]}>You won</Text>
              <Text style={[styles.winAmt, { color: c.price }]}>${wonAmount.toFixed(0)}</Text>
              <Text style={[styles.winSub, { color: c.muted }]}>in DealHub store credit</Text>
              <Pressable
                onPress={handleClaim}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: c.accent, opacity: pressed ? 0.9 : 1, marginTop: 16 },
                ]}>
                <Text style={styles.primaryBtnText}>Claim & continue shopping</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
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
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  badgeText: { fontWeight: '800', fontSize: 12 },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 4 },
  wheelBlock: { marginTop: 16, marginBottom: 8, alignItems: 'center' },
  pointerWrap: { marginBottom: -6, zIndex: 2 },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  primaryBtn: {
    marginTop: 8,
    width: '100%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  status: { marginTop: 14, fontSize: 15, fontWeight: '600' },
  resultBlock: { width: '100%', alignItems: 'center', marginTop: 8 },
  winTitle: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  winAmt: { fontSize: 42, fontWeight: '900', marginVertical: 4 },
  winSub: { fontSize: 14 },
});
