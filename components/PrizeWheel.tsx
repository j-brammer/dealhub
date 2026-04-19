import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const WHEEL_SIZE = 260;
const CX = 130;
const CY = 130;
const R = 125;

/** Label hit box: rotation is applied to the View so iOS uses a stable center origin (Text ignores/skews transforms). */
const LABEL_SLOT_W = 58;
const LABEL_SLOT_H = 30;
/** Slightly inside the rim so numbers sit in the wedge, not on divider lines. */
const LABEL_RADIUS_FR = 0.62;

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

/**
 * `midDeg` is clockwise from 12 o'clock. Rotate labels tangent to the rim so they read
 * around the wheel; flip 180° on the bottom half so text stays upright for the viewer.
 */
function labelRotationDeg(midDeg: number): number {
  let r = midDeg;
  if (midDeg > 90 && midDeg < 270) r += 180;
  return r;
}

type Props = {
  amounts: number[];
  /** When set, wheel animates to this winning slice index (0..n-1). */
  spinToIndex: number | null;
  onSpinAnimationEnd?: () => void;
};

export function PrizeWheel({ amounts, spinToIndex, onSpinAnimationEnd }: Props) {
  const n = amounts.length;
  const step = n > 0 ? 360 / n : 45;
  const rotation = useSharedValue(0);
  const onEndRef = useRef(onSpinAnimationEnd);
  onEndRef.current = onSpinAnimationEnd;

  useEffect(() => {
    if (spinToIndex == null || n < 1) return;

    const centerDeg = spinToIndex * step + step / 2;
    const normalize = (a: number) => ((a % 360) + 360) % 360;
    const align = normalize(360 - centerDeg);
    const fullSpins = 5 + Math.floor(Math.random() * 4);
    const delta = fullSpins * 360 + align;
    const target = rotation.value + delta;

    rotation.value = withTiming(
      target,
      { duration: 4800, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished && onEndRef.current) runOnJS(onEndRef.current)();
      }
    );
  }, [spinToIndex, n, step, rotation]);

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
              {amounts.map((_, i) => {
                const a0 = i * step;
                const a1 = (i + 1) * step;
                return (
                  <Path
                    key={i}
                    d={wedgePath(a0, a1)}
                    fill={WEDGE_COLORS[i % WEDGE_COLORS.length]}
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
                  <Text style={styles.labelText} numberOfLines={1}>
                    {`$\u2009${amt}`}
                  </Text>
                </View>
              );
            })}
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
