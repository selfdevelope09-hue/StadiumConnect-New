import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, IconButton, List, Surface } from 'react-native-paper';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { auth, db } from '@/config/firebase';
import { brand } from '@/config/appTheme';
import type { UserStackParamList } from '@/navigation/types';
import type { NotificationType } from '@/services/notificationService';

const ORANGE = brand.primary;
const C = 'notifications';

type Notif = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt?: Timestamp;
};

type Nav = NativeStackNavigationProp<UserStackParamList, 'Notifications'>;

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const uid = auth.currentUser?.uid;
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    if (!uid) {
      return;
    }
    const qy = query(collection(db, C), where('userId', '==', uid));
    return onSnapshot(qy, (snap) => {
      const rows: Notif[] = snap.docs.map((d) => {
        const v = d.data() as {
          type: NotificationType;
          title: string;
          body: string;
          isRead: boolean;
          data?: Record<string, unknown>;
          createdAt?: Timestamp;
        };
        return { id: d.id, ...v };
      });
      rows.sort((a, b) => {
        const ta = a.createdAt?.toMillis() ?? 0;
        const tb = b.createdAt?.toMillis() ?? 0;
        return tb - ta;
      });
      setItems(rows);
    });
  }, [uid]);

  const onOpen = useCallback(
    async (n: Notif) => {
      if (!n.isRead) {
        try {
          await updateDoc(doc(db, C, n.id), { isRead: true });
        } catch {
          // ignore
        }
      }
      if (
        n.type === 'PAYMENT_SUCCESS' ||
        n.type === 'BOOKING_CONFIRMED' ||
        n.type === 'PAYMENT_FAILED'
      ) {
        navigation.navigate('Bookings');
        return;
      }
      if (n.type === 'NEW_BOOKING_REQUEST' || n.type === 'PAYOUT_PROCESSED') {
        navigation.navigate('VendorManagement');
        return;
      }
      navigation.navigate('UserTabs', { screen: 'BookingsTab' });
    },
    [navigation]
  );

  const onMarkAll = useCallback(async () => {
    if (!uid) return;
    const qy = query(collection(db, C), where('userId', '==', uid));
    const s = await getDocs(qy);
    await Promise.all(
      s.docs.map((d) => updateDoc(d.ref, { isRead: true }))
    );
  }, [uid]);

  const onDelete = useCallback(async (n: Notif) => {
    try {
      await deleteDoc(doc(db, C, n.id));
    } catch {
      // ignore
    }
  }, []);

  if (!uid) {
    return (
      <View style={styles.centered}>
        <Text>Sign in to see notifications.</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Koi notification nahi abhi</Text>
        <Text style={styles.hint}>We will show booking and payment updates here.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Button
          mode="text"
          textColor={ORANGE}
          compact
          onPress={() => void onMarkAll()}
        >
          Mark all read
        </Button>
      </View>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item: n }) => (
          <Surface
            style={[
              styles.row,
              !n.isRead
                ? { borderLeftWidth: 4, borderLeftColor: ORANGE, backgroundColor: '#fff' }
                : { backgroundColor: '#f0f0f0' },
            ]}
            elevation={0}
          >
            <Pressable onPress={() => void onOpen(n)} style={styles.inner}>
              <List.Item
                title={n.title}
                titleNumberOfLines={2}
                description={n.body}
                descriptionNumberOfLines={3}
                right={() => (
                  <IconButton
                    icon="delete-outline"
                    onPress={() => void onDelete(n)}
                    accessibilityLabel="Delete notification"
                  />
                )}
              />
            </Pressable>
          </Surface>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 8 },
  row: { marginHorizontal: 12, marginVertical: 6, borderRadius: 8, overflow: 'hidden' },
  inner: { flex: 1 },
  empty: { fontSize: 18, textAlign: 'center', fontWeight: '600' },
  hint: { color: '#888', textAlign: 'center', marginTop: 8, paddingHorizontal: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});
