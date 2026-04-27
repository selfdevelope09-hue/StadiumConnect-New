import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, Chip, Menu } from 'react-native-paper';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/config/firebase';
import { brand } from '@/config/appTheme';
import { resolveAdminTask } from '@/services/stagedPaymentService';
import { Timestamp } from 'firebase/firestore';

const ORANGE = brand.primary;
const TASKS = 'adminTasks';
const USERS = 'users';

type Task = {
  id: string;
  type: string;
  status: string;
  bookingId: string;
  stageIndex: number;
  amount: number;
  proofType: 'screenshot' | 'utr';
  proofValue: string;
  priority: 'high' | 'normal';
  userId: string;
  vendorId: string;
  createdAt: Timestamp;
};

type Filter = 'all' | 'screenshot' | 'utr' | 'high';

function displayName(
  m: { displayName?: string; email?: string } | null
) {
  return m?.displayName || m?.email || '—';
}

export function PaymentVerificationScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, today: 0 });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const qy = query(
      collection(db, TASKS),
      where('type', '==', 'verify_payment')
    );
    return onSnapshot(qy, (snap) => {
      const rows: Task[] = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Task, 'id'>),
        }))
        .filter((r) => r.status === 'pending')
        .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
      setTasks(rows);
      setStats((s) => ({ ...s, pending: rows.length }));
      setErr(null);
    });
  }, []);

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // rough "today" count from in-memory
    setStats((s) => ({
      ...s,
      today: tasks.filter(
        (t) => t.createdAt?.toDate?.() && t.createdAt.toDate() >= d
      ).length,
    }));
  }, [tasks]);

  useEffect(() => {
    (async () => {
      const need = new Set<string>();
      tasks.forEach((t) => {
        need.add(t.userId);
        need.add(t.vendorId);
      });
      const updates: Record<string, string> = {};
      for (const uid of need) {
        const u = await getDoc(doc(db, USERS, uid));
        updates[uid] = displayName(
          u.data() as { displayName?: string; email?: string }
        );
      }
      if (Object.keys(updates).length) {
        setNames((p) => ({ ...p, ...updates }));
      }
    })();
  }, [tasks]);

  const filtered = tasks.filter((t) => {
    if (filter === 'screenshot') {
      return t.proofType === 'screenshot';
    }
    if (filter === 'utr') {
      return t.proofType === 'utr';
    }
    if (filter === 'high') {
      return t.amount >= 5000;
    }
    return true;
  });

  const onResolve = useCallback(
    async (id: string, r: 'approved' | 'rejected') => {
      const u = auth.currentUser;
      if (!u) {
        return;
      }
      setBusy(id);
      setErr(null);
      try {
        await resolveAdminTask(id, r, u.uid);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed');
      } finally {
        setBusy(null);
      }
    },
    []
  );

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Payment verification</Text>
      <View style={styles.kpiRow}>
        <Text style={styles.kpi}>
          Pending: {stats.pending}
        </Text>
        <Text style={styles.kpi}>
          New today: {stats.today}
        </Text>
      </View>
      <Menu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        anchor={
          <Button mode="outlined" onPress={() => setMenuOpen(true)} textColor={ORANGE}>
            Filter: {filter}
          </Button>
        }
      >
        <Menu.Item onPress={() => { setFilter('all'); setMenuOpen(false); }} title="All" />
        <Menu.Item onPress={() => { setFilter('screenshot'); setMenuOpen(false); }} title="Screenshot" />
        <Menu.Item onPress={() => { setFilter('utr'); setMenuOpen(false); }} title="UTR" />
        <Menu.Item onPress={() => { setFilter('high'); setMenuOpen(false); }} title="High amount" />
      </Menu>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {filtered.map((t) => (
        <Card key={t.id} style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.r}>
              <Text style={styles.bid}>{t.bookingId}</Text>
              <Chip compact>
                {t.priority === 'high' ? 'HIGH' : 'normal'}
              </Chip>
            </View>
            <Text style={styles.muted}>
              User: {names[t.userId] || t.userId.slice(0, 8)} · Vendor:{' '}
              {names[t.vendorId] || t.vendorId.slice(0, 8)}
            </Text>
            <Text>
              Stage index {t.stageIndex} (0-based) · Amount ₹
              {t.amount.toLocaleString('en-IN')}
            </Text>
            {t.proofType === 'utr' ? (
              <Text style={styles.utr} selectable>
                UTR: {t.proofValue}
              </Text>
            ) : (
              <View>
                <Text style={styles.muted}>Screenshot</Text>
                <Pressable onPress={() => setImgUrl(t.proofValue)}>
                  <Text style={styles.link}>Open / zoom</Text>
                </Pressable>
              </View>
            )}
            <View style={styles.actions}>
              <Button
                mode="contained"
                buttonColor="#15803d"
                disabled={busy === t.id}
                onPress={() => void onResolve(t.id, 'approved')}
              >
                Confirm
              </Button>
              <Button
                mode="outlined"
                textColor="#b91c1c"
                disabled={busy === t.id}
                onPress={() => void onResolve(t.id, 'rejected')}
              >
                Reject
              </Button>
            </View>
          </Card.Content>
        </Card>
      ))}
      {filtered.length === 0 && (
        <Text style={styles.muted2}>No pending verifications</Text>
      )}
      <Modal visible={!!imgUrl} transparent animationType="fade">
        <Pressable style={styles.modBg} onPress={() => setImgUrl(null)}>
          {imgUrl ? (
            <Image
              source={{ uri: imgUrl }}
              style={styles.modImg}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: ORANGE, marginBottom: 8 },
  kpiRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  kpi: { color: '#333', fontWeight: '600' },
  card: { marginBottom: 12, backgroundColor: '#fff' },
  r: { flexDirection: 'row', justifyContent: 'space-between' },
  bid: { fontWeight: '700' },
  muted: { color: '#4f6f8d', fontSize: 12, marginTop: 4 },
  muted2: { color: '#999', textAlign: 'center', marginTop: 20 },
  utr: { fontSize: 16, fontWeight: '600', marginTop: 6 },
  link: { color: ORANGE, textDecorationLine: 'underline' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  err: { color: '#b91c1c' },
  modBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
  },
  modImg: { width: '100%', height: 400 },
});
