import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const WHEEL_SIZE = 260;
const CX = 130;
const CY = 130;
const R = 125;

/** Label hit box: rotation is applied to the View so iOS uses a stable center origin (Text ignores/skews transforms). */
const LABEL_SLOT_W = 58;
const LABEL_SLOT_H = 30;
/** Near the rim for a denser, game-style wheel label position. */
const LABEL_RADIUS_FR = 0.8;

const WEDGE_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#95E1D3',
  '#F38181',
  '#AA96DA',
  '#FCBAD3',
  '#A8D8EA',
];
const JACKPOT_VALUE = 100;
function hueToColor(h: number): string {
  return `hsl(${Math.round(h % 360)} 95% 58%)`;
}

function wedgePath(degStart: number, degEnd: number): string {
  const rad = Math.PI / 180;
  const x1 = CX + R * Math.sin(degStart * rad);
  const y1 = CY - R * Math.cos(degStart * rad);
  const x2 = CX + R * Math.sin(degEnd * rad);
  const y2 = CY - R * Math.cos(degEnd * rad);
  const large = degEnd - degStart > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
}

function labelPos(midDeg: number, lr: number) {
  const rad = Math.PI / 180;
  return {
    x: CX + lr * Math.sin(midDeg * rad),
    y: CY - lr * Math.cos(midDeg * rad),
  };
}

/** `midDeg` is clockwise from 12 o'clock. Set labels radial so text bottom points toward center. */
function labelRotationDeg(midDeg: number): number {
  return midDeg;
}

function labelForAmount(amt: number, jackpotValue: number): string {
  if (amt === jackpotValue) return '💰';
  if (amt === 0) return '❌';
  return `$${amt}`;
}

function labelFontSize(label: string): number {
  if (label.length >= 6) return 10;
  if (label.length >= 5) return 11;
  if (label.length >= 4) return 12;
  return 14;
}

type Props = {
  amounts: number[];
  jackpotValue?: number;
  /** When set, wheel animates to this winning slice index (0..n-1). */
  spinToIndex: number | null;
  /** Increment to force a new spin even if index repeats. */
  spinToken?: number;
  onSpinAnimationEnd?: (landedIndex: number) => void;
};

export function PrizeWheel({
  amounts,
  jackpotValue = JACKPOT_VALUE,
  spinToIndex,
  spinToken = 0,
  onSpinAnimationEnd,
}: Props) {
  const n = amounts.length;
  const step = n > 0 ? 360 / n : 45;
  const rotation = useSharedValue(0);
  const [rainbowPhase, setRainbowPhase] = useState(0);

  useEffect(() => {
    let raf = 0;
    let start = 0;
    const loop = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const phase = (elapsed % 3200) / 3200;
      setRainbowPhase(phase);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const jackpotStops = useMemo(() => {
    const base = rainbowPhase * 360;
    return {
      a: hueToColor(base),
      b: hueToColor(base + 60),
      c: hueToColor(base + 120),
      d: hueToColor(base + 180),
      e: hueToColor(base + 240),
    };
  }, [rainbowPhase]);

  useEffect(() => {
    if (spinToIndex == null || n < 1) return;

    const centerDeg = spinToIndex * step + step / 2;
    const normalize = (a: number) => ((a % 360) + 360) % 360;
    const align = normalize(360 - centerDeg);
    const current = normalize(rotation.value);
    const toAlign = normalize(align - current);
    const fullSpins = 5 + Math.floor(Math.random() * 4);
    const delta = fullSpins * 360 + toAlign;
    const target = rotation.value + delta;

    rotation.value = withTiming(
      target,
      {
        duration: 3000,
        easing: Easing.bezier(0.08, 0.86, 0.22, 0.99),
        reduceMotion: ReduceMotion.Never,
      },
      (finished) => {
        if (finished && onSpinAnimationEnd) {
          runOnJS(onSpinAnimationEnd)(spinToIndex);
        }
      }
    );
  }, [spinToIndex, spinToken, n, step, rotation, onSpinAnimationEnd]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.wheel, animatedStyle]}>
        {/* Reanimated's Animated.View can mis-handle multiple children on iOS (Fragment/runtime errors). */}
        <View style={styles.wheelInner}>
          <View style={styles.layer}>
            <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox="0 0 260 260">
              <Defs>
                <LinearGradient id="jackpotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={jackpotStops.a} />
                  <Stop offset="25%" stopColor={jackpotStops.b} />
                  <Stop offset="50%" stopColor={jackpotStops.c} />
                  <Stop offset="75%" stopColor={jackpotStops.d} />
                  <Stop offset="100%" stopColor={jackpotStops.e} />
                </LinearGradient>
              </Defs>
              {amounts.map((_, i) => {
                const a0 = i * step;
                const a1 = (i + 1) * step;
                const fill = amounts[i] === jackpotValue ? 'url(#jackpotGradient)' : WEDGE_COLORS[i % WEDGE_COLORS.length];
                return (
                  <Path
                    key={i}
                    d={wedgePath(a0, a1)}
                    fill={fill}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                );
              })}
            </Svg>
          </View>
          <View style={[styles.layer, styles.labels]} pointerEvents="none">
            {amounts.map((amt, i) => {
              const a0 = i * step;
              const a1 = (i + 1) * step;
              const mid = (a0 + a1) / 2;
              const { x, y } = labelPos(mid, R * LABEL_RADIUS_FR);
              const rot = labelRotationDeg(mid);
              const label = labelForAmount(amt, jackpotValue);
              const dynamicFontSize = labelFontSize(label);
              return (
                <View
                  key={i}
                  pointerEvents="none"
                  style={[
                    styles.labelSlot,
                    {
                      left: x - LABEL_SLOT_W / 2,
                      top: y - LABEL_SLOT_H / 2,
                      transform: [{ rotate: `${rot}deg` }],
                    },
                  ]}>
                  <Text style={[styles.labelText, { fontSize: dynamicFontSize }]} numberOfLines={1} adjustsFontSizeToFit>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={[styles.layer, styles.centerHub]} pointerEvents="none">
            <View style={styles.centerHubDot} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
  },
  wheelInner: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  labels: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  centerHub: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHubDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#111827',
  },
  labelSlot: {
    position: 'absolute',
    width: LABEL_SLOT_W,
    height: LABEL_SLOT_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.3,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
