import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type Props = { children: ReactNode };

export function ShimmerText({ children }: Props) {
  const t = useSharedValue(0.35);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [t]);

  const a = useAnimatedStyle(() => ({
    opacity: t.value,
  }));

  return (
    <Animated.View style={a}>
      <Text style={styles.txt}>{children}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  txt: { color: '#a8a8c0', fontSize: 16, textAlign: 'center' },
});
