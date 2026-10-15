import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const PARTICLES = 18;

/** Confetti burst from the centre of its parent; fires again whenever `trigger` changes. */
export function Burst({ trigger, colors }: { trigger: number; colors: readonly string[] }) {
  const reduceMotion = useReducedMotion();
  if (trigger === 0 || reduceMotion) return null;
  return (
    <View pointerEvents="none" style={styles.layer}>
      {Array.from({ length: PARTICLES }, (_, i) => (
        <Particle key={`${trigger}-${i}`} index={i} color={colors[i % colors.length]} />
      ))}
    </View>
  );
}

function Particle({ index, color }: { index: number; color: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [progress]);

  const angle = (index / PARTICLES) * Math.PI * 2 + (index % 3) * 0.25;
  const distance = 80 + (index % 4) * 28;
  const animated = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: 1 - p * p,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * p - 40 * p },
        { rotate: `${p * 420}deg` },
        { scale: 1 - 0.4 * p },
      ],
    };
  });

  return <Animated.View style={[styles.particle, { backgroundColor: color, borderRadius: index % 2 ? 6 : 2 }, animated]} />;
}

/** Gentle breathing scale, used to invite a tap. */
export function Pulse({ active, style, children }: { active: boolean; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const on = active && !reduceMotion;

  useEffect(() => {
    if (on) {
      scale.set(withRepeat(withSequence(withTiming(1.03, { duration: 800 }), withTiming(1, { duration: 800 })), -1));
    } else {
      cancelAnimation(scale);
      scale.set(withTiming(1, { duration: 150 }));
    }
  }, [on, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 12,
    height: 12,
  },
});
