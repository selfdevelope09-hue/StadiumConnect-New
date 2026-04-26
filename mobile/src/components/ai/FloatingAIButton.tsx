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

import { AI_PURPLE } from './aiConstants';

type Props = {
  onPress: () => void;
};

const SIZE = 58;

export function FloatingAIButton({ onPress }: Props) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );
  }, [scale]);

  const pulse = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      style={[
        styles.wrap,
        { bottom: Math.max(insets.bottom, 12) + 12, right: 16 + insets.right },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPress}
        accessibilityLabel="Open AI vendor assistant"
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <Animated.View style={[styles.fab, pulse]}>
          <Text style={styles.emoji} allowFontScaling={false}>
            🤖
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 2000,
    elevation: 12,
  },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: AI_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  pressed: { opacity: 0.9 },
  emoji: { fontSize: 28, lineHeight: 32 },
});
