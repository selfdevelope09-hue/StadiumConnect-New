import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Divider } from 'react-native-paper';

import { auth } from '@/config/firebase';
import { brand } from '@/config/appTheme';
import type { UserStackParamList } from '@/navigation/types';
import {
  calculateFinalPrice,
  createCodPendingBooking,
  notifyAfterCodBooking,
  paymentHelp,
} from '@/services/paymentService';

type PaymentRoute = RouteProp<UserStackParamList, 'Payment'>;
const ORANGE = brand.primary;
type Nav = NativeStackNavigationProp<UserStackParamList, 'Payment'>;

/**
 * No card gateway. Choose: staged UPI (incl. deep link + QR on next screen) or cash on delivery.
 */
export function PaymentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PaymentRoute>();
  const p = route.params ?? {};
  const vendorName = p?.vendorName ?? 'Vendor';
  const vendorId = p?.vendorId ?? 'demo_vendor';
  const amount = typeof p?.amount === 'number' ? p.amount : 5000;
  const service = p?.service ?? 'Event service';
  const eventDate = p?.eventDate ?? 'TBD';
  const category = p?.category ?? 'caterer';

  const price = calculateFinalPrice(amount, 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const goStagedUPI = () => {
    setErr(null);
    const u = auth.currentUser;
    if (!u) {
      setErr('Please sign in first.');
      return;
    }
    navigation.navigate('UPIPayment', {
      totalAmount: amount,
      vendorId,
      vendorName,
      service,
      eventDate,
      category,
    });
  };

  const goTrack = (bookingId: string) => {
    navigation.navigate('BookingTracking', { bookingId });
  };

  const onCod = async () => {
    const u = auth.currentUser;
    if (!u) {
      setErr('Sign in to request COD.');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const bid = await createCodPendingBooking({
        userId: u.uid,
        vendorId,
        vendorName,
        service,
        eventDate,
        expectedAmount: price.totalPayable,
      });
      await notifyAfterCodBooking(u.uid, vendorId, {
        amount: price.totalPayable,
        bookingId: bid,
        vendorName,
        userName: u.displayName || u.email || 'User',
        eventDate,
      });
      setBusy(false);
      goTrack(bid);
    } catch (e) {
      setBusy(false);
      setErr(e instanceof Error ? e.message : 'Could not create COD request');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Payment</Text>
      <Text style={styles.muted}>
        UPI, QR, or cash on delivery. No card gateway — you control collections.
      </Text>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text style={styles.vname}>{vendorName}</Text>
          <Text style={styles.row}>Service: {service}</Text>
          <Text style={styles.row}>Event: {eventDate}</Text>
        </Card.Content>
      </Card>
      <View style={styles.table}>
        <Text style={styles.section}>Price (inv. model)</Text>
        <Row label="Service cost (incl. platform share)" value={fmtInr(price.vendorPrice)} />
        <Row label="Platform service fee (3%)" value={fmtInr(price.platformServiceFee)} />
        <Row label="Convenience fee" value={fmtInr(price.convenienceFee)} />
        <Row label="Subtotal" value={fmtInr(price.subtotal)} />
        <Row label="GST (18%)" value={fmtInr(price.gst)} />
        <View style={styles.line} />
        <Row label="Total payable" value={fmtInr(price.totalPayable)} bold />
      </View>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Text style={styles.sub}>1 — UPI (staged tranches, app deep link + QR)</Text>
      <Button
        mode="contained"
        buttonColor={ORANGE}
        onPress={goStagedUPI}
        style={styles.btn}
      >
        Pay with UPI (stages)
      </Button>
      <Text style={styles.muted2}>{paymentHelp.qr}</Text>
      <Divider style={styles.div} />
      <Text style={styles.sub}>
        2 — Cash on delivery
      </Text>
      <Text style={styles.muted2}>{paymentHelp.cod}</Text>
      <Button
        mode="outlined"
        onPress={onCod}
        disabled={busy}
        textColor={ORANGE}
        style={styles.btn}
      >
        {busy ? 'Saving…' : 'Request cash on delivery'}
      </Button>
      {Platform.OS === 'web' ? (
        <Text style={styles.muted2}>
          On web, UPI is best on your phone; use “Track UPI booking” in the menu for the same
          flow.
        </Text>
      ) : null}
      <Button mode="text" onPress={() => navigation.goBack()}>
        Back
      </Button>
    </ScrollView>
  );
}

function fmtInr(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.r}>
      <Text style={[styles.lbl, bold && styles.b]}>{label}</Text>
      <Text style={[styles.val, bold && styles.b]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '800', color: '#0e2a47' },
  muted: { color: '#4f6f8d', marginTop: 6, marginBottom: 16 },
  sub: { fontWeight: '700', color: ORANGE, marginTop: 12, marginBottom: 6 },
  muted2: { color: '#4f6f8d', fontSize: 12, lineHeight: 18, marginBottom: 6 },
  card: { marginBottom: 20, backgroundColor: '#f5faff' },
  vname: { fontSize: 18, fontWeight: '800', color: ORANGE, marginBottom: 8 },
  row: { color: '#444', marginBottom: 4 },
  section: { fontWeight: '800', color: '#333', marginBottom: 8 },
  table: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#f0d8cc' },
  r: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' },
  lbl: { color: '#555', maxWidth: '60%' },
  val: { color: '#111', fontWeight: '600' },
  b: { fontWeight: '800', color: ORANGE, fontSize: 16 },
  line: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  err: { color: '#b91c1c', marginBottom: 8 },
  btn: { marginTop: 8, paddingVertical: 4 },
  div: { marginVertical: 16 },
});
