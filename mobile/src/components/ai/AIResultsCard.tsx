import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Text as PaperText } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { AIVendorRecord } from '@/types/aiVendor';
import type { AIRecommendationItem } from '@/types/aiVendor';

import { AI_PURPLE } from './aiConstants';

type Props = {
  rec: AIRecommendationItem;
  vendor?: AIVendorRecord;
  isTopPick: boolean;
  onViewProfile: (vendorId: string) => void;
  onBook: (vendorId: string) => void;
};

function Stars({ rating }: { rating: number }) {
  const r = Math.round(rating);
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialCommunityIcons
          key={i}
          name={i <= r ? 'star' : 'star-outline'}
          size={16}
          color={i <= r ? '#fbbf24' : '#6b6b7a'}
        />
      ))}
    </View>
  );
}

export function AIResultsCard({
  rec,
  vendor,
  isTopPick,
  onViewProfile,
  onBook,
}: Props) {
  const img =
    vendor?.photoURL || vendor?.imageUrl || 'https://via.placeholder.com/120';
  const price =
    vendor?.priceRange ||
    (vendor?.minPrice != null
      ? `₹${vendor.minPrice}+`
      : '—');
  const area = vendor?.area || vendor?.city || '—';
  const rating = typeof vendor?.rating === 'number' ? vendor.rating : rec.matchScore / 20;
  const reviews = vendor?.reviewCount ?? 0;

  const cardInner = (
    <View
      style={[
        styles.inner,
        { borderColor: isTopPick ? 'transparent' : 'rgba(255,255,255,0.12)' },
      ]}
    >
      {isTopPick ? (
        <View style={styles.badgeRow}>
          <LinearGradient
            colors={['#6C63FF', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Text style={styles.badgeText}>⭐ AI Recommended</Text>
          </LinearGradient>
        </View>
      ) : null}
      <View style={styles.row}>
        <Image source={{ uri: img }} style={styles.avatar} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {rec.vendorName}
          </Text>
          <Stars rating={Math.min(5, Math.max(0, rating))} />
          <PaperText style={styles.meta} variant="bodySmall">
            {price} · {reviews} reviews · {area}
          </PaperText>
        </View>
        <View style={styles.score}>
          <Text style={styles.scoreVal}>{rec.matchScore}</Text>
          <Text style={styles.scoreLbl}>match</Text>
        </View>
      </View>
      <View style={styles.whyBox}>
        <Text style={styles.whyLabel}>Why AI picked this</Text>
        <Text style={styles.whyText}>{rec.whyPicked}</Text>
      </View>
      <View style={styles.actions}>
        <Button
          mode="outlined"
          textColor="#e8e8f0"
          onPress={() => onViewProfile(rec.vendorId)}
          style={styles.half}
        >
          View profile
        </Button>
        <Button
          mode="contained"
          buttonColor={AI_PURPLE}
          onPress={() => onBook(rec.vendorId)}
          style={styles.half}
        >
          Book now
        </Button>
      </View>
    </View>
  );

  if (isTopPick) {
    return (
      <LinearGradient
        colors={['#6C63FF', '#4c46b8', '#6C63FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientWrap}
      >
        {cardInner}
      </LinearGradient>
    );
  }

  return <View style={styles.plainWrap}>{cardInner}</View>;
}

const styles = StyleSheet.create({
  gradientWrap: {
    borderRadius: 16,
    padding: 2,
    marginBottom: 14,
  },
  plainWrap: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: 'hidden',
  },
  inner: {
    backgroundColor: '#1c1c28',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  badgeRow: { marginBottom: 10, alignItems: 'flex-start' },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#333' },
  info: { flex: 1, marginLeft: 12 },
  name: { color: '#fff', fontSize: 17, fontWeight: '700' },
  meta: { color: '#a0a0b8', marginTop: 4 },
  starsRow: { flexDirection: 'row', marginTop: 4, gap: 2 },
  score: { alignItems: 'center' },
  scoreVal: { color: AI_PURPLE, fontSize: 20, fontWeight: '800' },
  scoreLbl: { color: '#8888a0', fontSize: 10 },
  whyBox: { marginTop: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
  whyLabel: { color: '#8b8ba0', fontSize: 12, marginBottom: 4 },
  whyText: { color: '#d8d8e8', fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  half: { flex: 1 },
});
