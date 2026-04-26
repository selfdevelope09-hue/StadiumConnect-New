import React, { useEffect, useRef, useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
  Text,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOpenAIAssistant } from '@/context/AIAssistantContext';

import { AIChatModal } from './AIChatModal';

/** Extra lift so FAB clears bottom tab bar (UserTabs). */
const TAB_OFFSET = Platform.select({ ios: 78, android: 72, default: 72 });

type Props = {
  onBookNow?: (vendorId: string) => void;
};

export function FloatingChatButton({ onBookNow }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const { registerOpen } = useOpenAIAssistant();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    registerOpen?.(() => setModalVisible(true));
    return () => registerOpen?.(null);
  }, [registerOpen]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounceAnim, pulseAnim]);

  const bottom = Math.max(24, insets.bottom) + TAB_OFFSET;

  return (
    <>
      <View style={[styles.container, { bottom, right: 16 + insets.right }]} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.pulseRing,
            { transform: [{ scale: pulseAnim }], opacity: 0.3 },
          ]}
        />
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
            accessibilityLabel="Open AI vendor assistant"
          >
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>AI</Text>
            </View>
            <Text style={styles.emoji} allowFontScaling={false}>
              🤖
            </Text>
          </TouchableOpacity>
        </Animated.View>
        <View style={styles.label}>
          <Text style={styles.labelText}>AI</Text>
        </View>
      </View>

      <AIChatModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onBookNow={(vendorId) => {
          setModalVisible(false);
          onBookNow?.(vendorId);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 30,
  },
  pulseRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B35',
    top: 0,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
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
    borderColor: '#FF6B35',
  },
  badgeTxt: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FF6B35',
  },
  emoji: { fontSize: 26 },
  label: {
    backgroundColor: '#333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  labelText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});
