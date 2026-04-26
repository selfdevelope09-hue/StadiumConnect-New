import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, Surface } from 'react-native-paper';
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { brand } from '@/config/appTheme';

const ORANGE = brand.primary;
const VENDORS = 'vendors';
const BOOK = 'bookings';
const PAYOUTS = 'vendorPayouts';
const TXN = 'transactions';

type CommRow = { vendorId: string; name: string; totalFee: number; bookings: number };

function isThisMonth(t?: Timestamp) {
  if (!t) {
    return false;
  }
  const d = t.toDate();
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
  );
}

export function CommissionDashboard() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [rows, setRows] = useState<CommRow[]>([]);
  const [pending, setPending] = useState(0);
  const [tx, setTx] = useState<{ id: string; type: string; amount: number }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const bSnap = await getDocs(query(collection(db, BOOK)));
      let total = 0;
      let month = 0;
      const byV = new Map<string, { name: string; totalFee: number; bookings: number }>();

      bSnap.forEach((d) => {
        const x = d.data() as {
          status?: string;
          commission?: { platformFee?: number };
          vendorId?: string;
          vendorName?: string;
          paidAt?: Timestamp;
        };
        if (x.status !== 'confirmed' && x.status !== 'paid') {
          return;
        }
        const fee = x.commission?.platformFee ?? 0;
        total += fee;
        const pAt = x.paidAt;
        if (isThisMonth(pAt)) {
          month += fee;
        }
        const vid = x.vendorId || 'unknown';
        const cur = byV.get(vid) || {
          name: x.vendorName || vid,
          totalFee: 0,
          bookings: 0,
        };
        cur.totalFee += fee;
        cur.bookings += 1;
        byV.set(vid, cur);
      });
      setTotalRevenue(Math.round(total * 100) / 100);
      setMonthRevenue(Math.round(month * 100) / 100);
      setRows(
        Array.from(byV.entries()).map(([vendorId, v]) => ({
          vendorId,
          name: v.name,
          totalFee: Math.round(v.totalFee * 100) / 100,
          bookings: v.bookings,
        }))
      );

      const paySnap = await getDocs(
        query(collection(db, PAYOUTS), where('status', '==', 'pending'))
      );
      let pend = 0;
      paySnap.forEach((d) => {
        const a = (d.data() as { amount?: number }).amount ?? 0;
        pend += a;
      });
      setPending(pend);

      const tSnap = await getDocs(query(collection(db, TXN)));
      const tRows = tSnap.docs.map((d) => {
        const w = d.data() as { type: string; amount: number; timestamp?: Timestamp };
        return { id: d.id, type: w.type, amount: w.amount, t: w.timestamp };
      });
      tRows.sort((a, b) => (b.t?.toMillis() ?? 0) - (a.t?.toMillis() ?? 0));
      setTx(
        tRows.slice(0, 30).map(({ id, type, amount }) => ({ id, type, amount }))
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Load failed (indexes?)');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Commission & payouts</Text>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <View style={styles.kpis}>
        <Kpi t="All-time commission" v={`₹${totalRevenue.toLocaleString('en-IN')}`} />
        <Kpi
          t="This month (paid bookings)"
          v={`₹${monthRevenue.toLocaleString('en-IN')}`}
        />
        <Kpi
          t="Pending vendor payouts"
          v={`₹${pending.toLocaleString('en-IN')}`}
        />
      </View>
      <Text style={styles.sec}>Per-vendor (confirmed bookings)</Text>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          {rows.length === 0 ? (
            <Text style={styles.muted}>No paid bookings in Firestore yet.</Text>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={rows}
              keyExtractor={(r) => r.vendorId}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.rName}>{item.name}</Text>
                  <Text style={styles.rSub}>
                    {item.bookings} booking(s) · fee ₹{item.totalFee.toLocaleString('en-IN')}
                  </Text>
                </View>
              )}
            />
          )}
        </Card.Content>
      </Card>
      <Text style={styles.sec}>Recent transactions</Text>
      {tx.length === 0 ? (
        <Text style={styles.muted}>No rows in {TXN} yet.</Text>
      ) : (
        tx.map((t) => (
          <Surface key={t.id} style={styles.tx} elevation={0}>
            <Text>
              {t.type} — ₹{t.amount.toLocaleString('en-IN')}
            </Text>
          </Surface>
        ))
      )}
    </ScrollView>
  );
}

function Kpi({ t, v }: { t: string; v: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kT}>{t}</Text>
      <Text style={styles.kV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '800', color: ORANGE, marginBottom: 12 },
  err: { color: '#b91c1c', marginBottom: 8 },
  kpis: { gap: 12, marginBottom: 20 },
  kpi: { backgroundColor: '#fff7f0', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#ffd3bf' },
  kT: { color: '#666', fontSize: 13 },
  kV: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  sec: { fontWeight: '700', marginTop: 8, marginBottom: 8 },
  card: { backgroundColor: '#fff', marginBottom: 16 },
  row: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 8 },
  rName: { fontWeight: '700' },
  rSub: { color: '#666', fontSize: 13 },
  muted: { color: '#888' },
  tx: { padding: 12, marginBottom: 6, backgroundColor: '#f8f8f8', borderRadius: 8 },
});
