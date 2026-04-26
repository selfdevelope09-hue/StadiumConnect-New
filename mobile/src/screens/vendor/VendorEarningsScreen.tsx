import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Card } from 'react-native-paper';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import { brand } from '@/config/appTheme';

const ORANGE = brand.primary;
const PAYOUTS = 'vendorPayouts';
const BOOK = 'bookings';

type Payout = {
  id: string;
  netAmount: number;
  grossAmount: number;
  commission: number;
  status: string;
  bookingId: string;
  stageIndex: number;
  createdAt: Timestamp;
};

export function VendorEarningsScreen() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [bookingRows, setBookingRows] = useState<{ id: string; t: string; a: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const uid = auth.currentUser?.uid;

  const load = useCallback((vendorId: string) => {
    const qP = query(collection(db, PAYOUTS), where('vendorId', '==', vendorId));
    return onSnapshot(qP, (s) => {
      const p: Payout[] = s.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Payout, 'id'>),
      }));
      p.sort(
        (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
      );
      setPayouts(p);
    });
  }, []);

  const loadBookings = useCallback(async (vendorId: string) => {
    const s = await getDocs(
      query(collection(db, BOOK), where('vendorId', '==', vendorId))
    );
    const rows: { id: string; t: string; a: number }[] = [];
    s.forEach((d) => {
      const x = d.data() as { paymentModel?: string; totalAmount?: number; vendorName?: string };
      if (x.paymentModel === 'upi_staged' && x.totalAmount) {
        rows.push({ id: d.id, t: d.id.slice(0, 8), a: x.totalAmount });
      }
    });
    setBookingRows(rows);
  }, []);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = load(uid);
    void loadBookings(uid).finally(() => setLoading(false));
    return () => unsubscribe();
  }, [uid, load, loadBookings]);

  if (!uid) {
    return (
      <View style={styles.c}>
        <Text>Sign in as vendor to see earnings.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.c}>
        <ActivityIndicator color={ORANGE} />
      </View>
    );
  }

  const totalNet = payouts.reduce((a, p) => a + (p.netAmount || 0), 0);
  const totalGross = payouts.reduce((a, p) => a + (p.grossAmount || 0), 0);
  const totalFee = payouts.reduce((a, p) => a + (p.commission || 0), 0);
  const pending = payouts
    .filter((p) => p.status === 'pending_transfer')
    .reduce((a, p) => a + p.netAmount, 0);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Earnings (UPI staged)</Text>
      <Text style={styles.muted}>
        Platform keeps 5% of each tranche you collect; net is your payout
        line.
      </Text>
      <View style={styles.kpiRow}>
        <Kpi t="Gross (stages released)" v={`₹${totalGross.toLocaleString('en-IN')}`} />
        <Kpi t="Our commission" v={`₹${totalFee.toLocaleString('en-IN')}`} />
        <Kpi t="Net to you" v={`₹${totalNet.toLocaleString('en-IN')}`} />
        <Kpi t="Pending transfer" v={`₹${pending.toLocaleString('en-IN')}`} />
      </View>
      <Text style={styles.sec}>Per tranche (vendorPayouts)</Text>
      {payouts.length === 0 ? (
        <Text style={styles.muted}>No payouts yet.</Text>
      ) : (
        payouts.map((p) => (
          <Card key={p.id} style={styles.crd} mode="outlined">
            <Card.Content>
              <Text style={styles.t}>
                Booking {p.bookingId?.slice(0, 8)} — stage {p.stageIndex + 1}
              </Text>
              <Text>
                Gross ₹{p.grossAmount?.toLocaleString('en-IN')} · fee ₹
                {p.commission?.toLocaleString('en-IN')} · you ₹
                {p.netAmount?.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.st}>{p.status}</Text>
            </Card.Content>
          </Card>
        ))
      )}
      <Text style={styles.sec}>Active staged bookings (totals)</Text>
      {bookingRows.map((b) => (
        <Text key={b.id} style={styles.row}>
          {b.t}… · total ₹{b.a.toLocaleString('en-IN')}
        </Text>
      ))}
    </ScrollView>
  );
}

function Kpi({ t, v }: { t: string; v: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kt}>{t}</Text>
      <Text style={styles.kv}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', padding: 24, alignItems: 'center' },
  wrap: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '800', color: ORANGE, marginBottom: 6 },
  muted: { color: '#666', marginBottom: 12 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  kpi: { flex: 1, minWidth: 140, backgroundColor: '#fff7f0', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ffd3bf' },
  kt: { color: '#666', fontSize: 11 },
  kv: { fontSize: 16, fontWeight: '800' },
  sec: { fontWeight: '700', marginTop: 12, marginBottom: 6 },
  crd: { marginBottom: 8, backgroundColor: '#fff' },
  t: { fontWeight: '600' },
  st: { color: ORANGE, fontSize: 12, marginTop: 4 },
  row: { marginBottom: 4, color: '#444' },
});
