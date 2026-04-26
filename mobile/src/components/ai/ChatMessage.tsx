import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import type { VendorResult } from '@/services/aiChatService';

export type MessageType =
  | 'ai_text'
  | 'user_text'
  | 'typing'
  | 'results'
  | 'quick_replies';

export interface Message {
  id: string;
  type: MessageType;
  text?: string;
  results?: {
    top3: VendorResult[];
    myPick: {
      vendorId: string;
      vendorName: string;
      reason: string;
      tip: string;
    };
    followUpQuestion: string;
  };
  chips?: string[];
  timestamp: Date;
}

interface Props {
  message: Message;
  onChipPress?: (chip: string) => void;
  onBookNow?: (vendorId: string) => void;
}

export const ChatMessage: React.FC<Props> = ({
  message,
  onChipPress,
  onBookNow,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (message.type === 'typing') {
    return <TypingIndicator />;
  }

  if (message.type === 'results' && message.results) {
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <ResultsCard
          results={message.results}
          onBookNow={onBookNow}
          onChipPress={onChipPress}
        />
      </Animated.View>
    );
  }

  if (message.type === 'quick_replies' && message.chips) {
    return (
      <Animated.View style={[styles.chipsRow, { opacity: fadeAnim }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {message.chips.map((chip, i) => (
            <TouchableOpacity
              key={i}
              style={styles.chip}
              onPress={() => onChipPress?.(chip)}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    );
  }

  const isAI = message.type === 'ai_text';

  return (
    <Animated.View
      style={[
        styles.row,
        isAI ? styles.aiRow : styles.userRow,
        { opacity: fadeAnim },
      ]}
    >
      {isAI && (
        <View style={styles.avatar}>
          <Text style={{ fontSize: 16 }}>🤖</Text>
        </View>
      )}
      <View style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble]}>
        <Text style={[styles.bubbleText, isAI ? styles.aiText : styles.userText]}>
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
};

const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingRow}>
      <View style={styles.avatar}>
        <Text style={{ fontSize: 16 }}>🤖</Text>
      </View>
      <View style={styles.typingBubble}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { transform: [{ translateY: dot }] }]}
          />
        ))}
      </View>
    </View>
  );
};

const ResultsCard = ({
  results,
  onBookNow,
  onChipPress,
}: {
  results: NonNullable<Message['results']>;
  onBookNow?: (vendorId: string) => void;
  onChipPress?: (chip: string) => void;
}) => {
  const { top3, myPick, followUpQuestion } = results;

  return (
    <View style={styles.resultsContainer}>
      {top3.map((vendor: VendorResult) => (
        <View key={vendor.vendorId} style={styles.vendorCard}>
          <View style={styles.vendorHeader}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{vendor.rank}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vendorName}>{vendor.vendorName}</Text>
              <Text style={styles.vendorCategory}>{vendor.category}</Text>
            </View>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingText}>⭐ {vendor.rating}</Text>
            </View>
          </View>
          <Text style={styles.vendorCity}>📍 {vendor.city}</Text>
          <Text style={styles.vendorPrice}>💰 {vendor.priceRange}</Text>
          <Text style={styles.whyText}>💡 {vendor.whyPicked}</Text>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => onBookNow?.(vendor.vendorId)}
          >
            <Text style={styles.bookBtnText}>Book Now →</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.topPickCard}>
        <Text style={styles.topPickLabel}>⭐ AI की Best Pick</Text>
        <Text style={styles.topPickName}>{myPick.vendorName}</Text>
        <Text style={styles.topPickReason}>{myPick.reason}</Text>
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>💡 Tip: {myPick.tip}</Text>
        </View>
        <TouchableOpacity
          style={styles.topPickBtn}
          onPress={() => onBookNow?.(myPick.vendorId)}
        >
          <Text style={styles.bookBtnText}>Book Best Pick →</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.followUp}>{followUpQuestion}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {['🔄 Naya Search', '📋 Sab Vendors', '💬 Aur Poochho'].map(
          (chip, i) => (
            <TouchableOpacity
              key={i}
              style={styles.chip}
              onPress={() => onChipPress?.(chip)}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 4, paddingHorizontal: 12 },
  aiRow: { justifyContent: 'flex-start' },
  userRow: { justifyContent: 'flex-end' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  aiBubble: {
    backgroundColor: '#FFF0EA',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#FF6B35',
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  aiText: { color: '#333' },
  userText: { color: '#fff' },
  typingRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: '#FFF0EA',
    padding: 14,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
    marginHorizontal: 2,
  },
  chipsRow: { paddingHorizontal: 12, marginVertical: 6 },
  chip: {
    backgroundColor: '#FFF0EA',
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipText: { color: '#FF6B35', fontSize: 13, fontWeight: '600' },
  resultsContainer: { paddingHorizontal: 12, marginVertical: 6 },
  vendorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  vendorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  rankBadge: {
    backgroundColor: '#FF6B35',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  vendorName: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  vendorCategory: { fontSize: 12, color: '#FF6B35' },
  ratingBox: {
    backgroundColor: '#FFF0EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: { fontSize: 12, fontWeight: 'bold', color: '#FF6B35' },
  vendorCity: { fontSize: 12, color: '#666', marginBottom: 2 },
  vendorPrice: { fontSize: 13, color: '#FF6B35', fontWeight: '600', marginBottom: 4 },
  whyText: { fontSize: 12, color: '#888', fontStyle: 'italic', marginBottom: 8 },
  bookBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  bookBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  topPickCard: {
    backgroundColor: '#FFF8F5',
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  topPickLabel: {
    color: '#FF6B35',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 4,
  },
  topPickName: { fontWeight: 'bold', fontSize: 16, color: '#333', marginBottom: 6 },
  topPickReason: { fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 8 },
  tipBox: {
    backgroundColor: '#FFFBEA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  tipText: { fontSize: 12, color: '#B45309' },
  topPickBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  followUp: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
