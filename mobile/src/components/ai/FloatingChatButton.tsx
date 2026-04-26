import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ORANGE = '#FF6B35';
const ORANGE_2 = '#FF8C42';
const SIZE = 58;

type Props = { onPress: () => void };

export function FloatingChatButton({ onPress }: Props) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 800 }),
        withTiming(0.5, { duration: 800 })
      ),
      -1,
      true
    );
  }, [glow, scale]);

  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowA = useAnimatedStyle(() => ({
    opacity: glow.value * 0.4,
  }));

  return (
    <View
      style={[
        styles.host,
        {
          bottom: Math.max(16, insets.bottom) + 8,
          right: 14 + insets.right,
        },
      ]}
      pointerEvents="box-none"
    >
      <Animated.View style={[styles.glow, glowA]} />
      <Pressable
        onPress={onPress}
        accessibilityLabel="Open AI vendor assistant"
        style={({ pressed }) => [pressed && { opacity: 0.92 }]}
      >
        <Animated.View style={[styles.fab, pulse]}>
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>AI</Text>
          </View>
          <Text style={styles.emoji} allowFontScaling={false}>
            🤖
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 20,
  },
  glow: {
    position: 'absolute',
    width: SIZE + 20,
    height: SIZE + 20,
    borderRadius: (SIZE + 20) / 2,
    backgroundColor: ORANGE_2,
    left: -10,
    top: -10,
  },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: ORANGE,
  },
  badgeTxt: {
    fontSize: 9,
    fontWeight: '900',
    color: ORANGE,
  },
  emoji: { fontSize: 28, lineHeight: 32 },
});
