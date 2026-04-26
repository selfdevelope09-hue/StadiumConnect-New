import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import { brand } from '@/config/appTheme';
import type { UserStackParamList } from '@/navigation/types';

const ORANGE = brand.primary;
const C = 'notifications';

type Nav = NativeStackNavigationProp<UserStackParamList>;

/**
 * Renders a bell in the user tab header; opens the in-app notification center.
 */
export function NotificationBellButton() {
  const navigation = useNavigation<Nav>();
  const [unread, setUnread] = useState(0);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      return;
    }
    const qy = query(collection(db, C), where('userId', '==', uid));
    return onSnapshot(qy, (s) => {
      setUnread(
        s.docs.filter(
          (d) => !(d.data() as { isRead?: boolean }).isRead
        ).length
      );
    });
  }, [uid]);

  const go = () => {
    if (!uid) {
      return;
    }
    navigation.getParent()?.navigate('Notifications');
  };

  if (!uid) {
    return null;
  }

  return (
    <Pressable
      onPress={go}
      style={({ pressed }) => [styles.h, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel="Open notifications"
    >
      <MaterialCommunityIcons name="bell-outline" size={24} color={ORANGE} />
      {unread > 0 && (
        <View style={styles.badge} accessibilityElementsHidden>
          <Text style={styles.bText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h: { marginRight: 12, padding: 4, justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
