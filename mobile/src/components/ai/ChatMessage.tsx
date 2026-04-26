import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const ORANGE = '#FF6B35';
const ORANGE_LIGHT = '#FFF0EA';
const TEXT = '#333333';

type Role = 'user' | 'ai';

type Props = {
  role: Role;
  text: string;
};

export function ChatMessageBubble({ role, text }: Props) {
  const isUser = role === 'user';
  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowAi,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAi,
        ]}
      >
        <Text style={[styles.txt, isUser ? styles.txtUser : styles.txtAi]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function BouncingDot({ delay }: { delay: number }) {
  const o = useSharedValue(0.35);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 360 }),
          withTiming(0.35, { duration: 360 })
        ),
        -1,
        false
      )
    );
  }, [delay, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.dot, st]} />;
}

export function TypingIndicator() {
  return (
    <View style={[styles.row, styles.rowAi]}>
      <View style={[styles.bubble, styles.bubbleAi, styles.typingWrap]}>
        <View style={styles.dotsRow}>
          <BouncingDot delay={0} />
          <BouncingDot delay={120} />
          <BouncingDot delay={240} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 10, paddingHorizontal: 4 },
  rowAi: { alignItems: 'flex-start' },
  rowUser: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleAi: {
    backgroundColor: ORANGE_LIGHT,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: ORANGE,
    borderBottomRightRadius: 4,
  },
  txt: { fontSize: 15, lineHeight: 22 },
  txtAi: { color: ORANGE },
  txtUser: { color: '#FFFFFF' },
  typingWrap: { minWidth: 56, minHeight: 36, justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ORANGE,
  },
});
