import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, Chip } from 'react-native-paper';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { auth, db } from '@/config/firebase';
import { brand } from '@/config/appTheme';
import type { UserStackParamList } from '@/navigation/types';
import { calculateFinalPrice } from '@/services/pricingService';
import { generateAndShareInvoice } from '@/services/invoiceService';
import type { StagedBookingRecord, StagedRow } from '@/types/stagedPayment';

const ORANGE = brand.primary;

type Nav = NativeStackNavigationProp<UserStackParamList, 'BookingTracking'>;
type R = RouteProp<UserStackParamList, 'BookingTracking'>;

function formatStatus(s: StagedRow) {
  if (s.status === 'paid') {
    return '✅ PAID';
  }
  if (s.status === 'waived') {
    return '— Waived';
  }
  if (s.status === 'proof_submitted' || s.status === 'verifying') {
    return '⏳ Verification pending';
  }
  if (s.amount === 0) {
    return '—';
  }
  return '⏳ PAY NOW';
}

export function BookingTrackingScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const [list, setList] = useState<{ id: string; data: StagedBookingRecord }[]>([]);
  const [one, setOne] = useState<StagedBookingRecord | null>(null);
  const [id, setId] = useState(route.params?.bookingId || '');
  const [loading, setLoading] = useState(true);
  const [invBusy, setInvBusy] = useState(false);
  const [invMsg, setInvMsg] = useState<string | null>(null);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) {
      setLoading(false);
      return;
    }
    if (id) {
      return onSnapshot(doc(db, 'bookings', id), (s) => {
        if (s.exists()) {
          setOne(s.data() as StagedBookingRecord);
        }
        setLoading(false);
      });
    }
    const qy = query(
      collection(db, 'bookings'),
      where('userId', '==', u.uid)
    );
    return onSnapshot(qy, (snap) => {
      const rows: { id: string; data: StagedBookingRecord }[] = [];
      snap.forEach((d) => {
        const x = d.data() as StagedBookingRecord;
        const pm = (d.data() as { paymentModel?: string }).paymentModel;
        if (pm === 'upi_staged' || pm === 'cod') {
          rows.push({ id: d.id, data: x });
        }
      });
      setList(rows);
      setLoading(false);
    });
  }, [id]);

  const goPay = useCallback(
    (bookingId: string, stageIndex: number) => {
      navigation.navigate('UPIPayment', { bookingId, stageIndex });
    },
    [navigation]
  );

  const onInvoice = useCallback(async () => {
    if (!id) {
      return;
    }
    setInvMsg(null);
    setInvBusy(true);
    const r = await generateAndShareInvoice(id);
    setInvBusy(false);
    if (!r.success) {
      setInvMsg(r.error || 'Failed');
    } else {
      setInvMsg('PDF ready. Check share sheet; copy also saved in your account');
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={ORANGE} />
      </View>
    );
  }

  if (!auth.currentUser) {
    return (
      <View style={styles.center}>
        <Text>Sign in to track bookings.</Text>
      </View>
    );
  }

  if (!id) {
    return (
      <View style={styles.root}>
        <Text style={styles.h1}>Your bookings</Text>
        <FlatList
          data={list}
          keyExtractor={(it) => it.id}
          ListEmptyComponent={<Text style={styles.muted}>No bookings yet.</Text>}
          renderItem={({ item }) => {
            const d = item.data as StagedBookingRecord & {
              amount?: number;
              status?: string;
            };
            const paymentModel = (item.data as { paymentModel?: string })
              .paymentModel;
            const amt = d.totalAmount ?? d.amount;
            const st =
              paymentModel === 'cod' ? d.status : d.overallStatus;
            return (
            <Pressable
              onPress={() => {
                setId(item.id);
                setOne(item.data);
              }}
            >
              <Card style={styles.card} mode="outlined">
                <Card.Content>
                  <Text style={styles.t}>{d.vendorName}</Text>
                  <Text style={styles.muted}>
                    ₹{amt != null ? amt.toLocaleString('en-IN') : '—'} · {String(st)}
                  </Text>
                </Card.Content>
              </Card>
            </Pressable>
            );
          }}
        />
      </View>
    );
  }

  const b = one;
  if (!b) {
    return (
      <View style={styles.center}>
        <Text>Booking not found</Text>
        <Button onPress={() => setId('')}>Back to list</Button>
      </View>
    );
  }

  const paymentModel = (b as { paymentModel?: string }).paymentModel;
  const codAmount = (b as { amount?: number }).amount;
  if (paymentModel === 'cod' || !b.paymentStages?.length) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Button mode="text" onPress={() => setId('')} textColor={ORANGE}>
          ← All bookings
        </Button>
        <Text style={styles.h1}>{b.vendorName}</Text>
        <Text style={styles.line}>
          Cash on delivery · Expected ₹
          {codAmount?.toLocaleString('en-IN') ?? '—'}
        </Text>
        <Text style={styles.muted2}>
          Pay the vendor in cash on delivery. This booking is not on the UPI
          tranche plan.
        </Text>
        <Text style={styles.muted2}>ID: {id}</Text>
      </ScrollView>
    );
  }

  const pBreak =
    typeof b.vendorBasePrice === 'number'
      ? calculateFinalPrice(b.vendorBasePrice, 0)
      : null;
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Button mode="text" onPress={() => setId('')} textColor={ORANGE}>
        ← All bookings
      </Button>
      <Text style={styles.h1}>{b.vendorName}</Text>
      <Text style={styles.line}>
        Order total (customer): ₹
        {b.totalAmount?.toLocaleString('en-IN') ?? '—'}
        {pBreak
          ? ` · Service (incl. platform): ₹${pBreak.vendorPrice.toLocaleString('en-IN')}`
          : null}
      </Text>
      <Text style={styles.muted2}>
        Tranches (UPI) follow your category schedule. Platform keeps a small
        tranche-based fee on each collection (see admin).
      </Text>
      <Button
        mode="contained"
        buttonColor={ORANGE}
        onPress={onInvoice}
        disabled={invBusy}
        style={styles.invBtn}
      >
        {invBusy ? 'Preparing…' : 'Download / share tax invoice (PDF)'}
      </Button>
      {invMsg ? <Text style={styles.invNote}>{invMsg}</Text> : null}
      {b.paymentStages.map((s, idx) => {
        const isLocked =
          s.amount > 0 &&
          s.status === 'pending' &&
          b.paymentStages.some(
            (x, j) => j < idx && x.amount > 0 && x.status !== 'paid' && x.status !== 'waived'
          );
        return (
          <Card key={s.stage} style={styles.stage} mode="outlined">
            <Card.Content>
              <View style={styles.row}>
                <Text style={styles.stTitle}>
                  Stage {s.stage}: {s.label} (
                  {s.percent}% = ₹{s.amount.toLocaleString('en-IN')})
                </Text>
                <Chip compact>{formatStatus(s)}</Chip>
              </View>
              {s.utrNumber ? (
                <Text selectable style={styles.utr}>
                  UTR: {s.utrNumber}
                </Text>
              ) : null}
              {s.paidAt ? (
                <Text style={styles.muted2}>Settled in system</Text>
              ) : null}
              {s.amount > 0 && s.status === 'pending' && !isLocked && (
                <Button
                  mode="contained"
                  buttonColor={ORANGE}
                  onPress={() => goPay(id, idx)}
                >
                  Pay ₹{s.amount.toLocaleString('en-IN')}
                </Button>
              )}
              {isLocked && (
                <Text style={styles.lock}>🔒 Pay previous stage first</Text>
              )}
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', padding: 24, alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: ORANGE },
  line: { marginTop: 6, color: '#333' },
  muted: { color: '#888' },
  muted2: { color: '#666', fontSize: 12, marginBottom: 12 },
  card: { marginBottom: 8, backgroundColor: '#fffaf6' },
  t: { fontSize: 16, fontWeight: '600' },
  stage: { marginBottom: 10, backgroundColor: '#fff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  stTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  utr: { fontSize: 12, color: '#444', marginTop: 4 },
  lock: { color: '#888', marginTop: 6 },
  invBtn: { marginTop: 8, marginBottom: 4 },
  invNote: { color: '#444', fontSize: 12, marginBottom: 8 },
});
