import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card } from 'react-native-paper';

import { auth } from '@/config/firebase';
import { brand } from '@/config/appTheme';
import type { UserStackParamList } from '@/navigation/types';
import {
  calculateCommission,
  confirmBookingAfterPayment,
  createRazorpayOrder,
  notifyAfterSuccessfulPayment,
  openRazorpayCheckout,
  type UserInfo,
} from '@/services/paymentService';

type PaymentRoute = RouteProp<UserStackParamList, 'Payment'>;

const ORANGE = brand.primary;

type Nav = NativeStackNavigationProp<UserStackParamList, 'Payment'>;

export function PaymentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PaymentRoute>();
  const p = route.params ?? {};
  const vendorName = p?.vendorName ?? 'Vendor';
  const vendorId = p?.vendorId ?? 'demo_vendor';
  const amount = typeof p?.amount === 'number' ? p.amount : 5000;
  const service = p?.service ?? 'Event service';
  const eventDate = p?.eventDate ?? 'TBD';

  const breakdown = calculateCommission(amount);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pay = async () => {
    const u = auth.currentUser;
    if (!u) {
      setErr('Please sign in first.');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const order = await createRazorpayOrder({
        vendorId,
        userId: u.uid,
        amount: breakdown.totalCharged,
        vendorName,
        notes: { service, eventDate },
      });
      await openRazorpayCheckout(
        {
          id: order.id,
          amount: order.amount,
          currency: (order.currency as string) || 'INR',
        },
        {
          name: u.displayName || 'User',
          email: u.email || 'user@stadiumconnect.com',
          contact: (u as { phoneNumber?: string | null }).phoneNumber || '9999999999',
        } as UserInfo,
        async (res) => {
          try {
            const bid = await confirmBookingAfterPayment(
              {
                razorpay_payment_id: res.razorpay_payment_id,
                razorpay_order_id: res.razorpay_order_id,
                razorpay_signature: res.razorpay_signature,
              },
              {
                userId: u.uid,
                vendorId,
                amount,
                vendorName,
                service,
                eventDate,
                orderId: order.id,
              }
            );
            await notifyAfterSuccessfulPayment(u.uid, vendorId, {
              amount: breakdown.totalCharged,
              bookingId: bid,
              vendorName,
              userName: u.displayName || u.email || 'User',
              eventDate,
            });
            setBusy(false);
            navigation.replace('BookingConfirmed', {
              bookingId: bid,
              paymentId: res.razorpay_payment_id,
              orderId: order.id,
              vendorName,
              amount: breakdown.totalCharged,
              vendorId,
            });
          } catch (ce) {
            setBusy(false);
            setErr(
              ce instanceof Error
                ? ce.message
                : 'Could not save booking after payment.'
            );
          }
        },
        (e) => {
          setBusy(false);
          setErr(
            (e as { error?: { description: string } }).error?.description ||
              (e as { description: string }).description ||
              'Payment failed'
          );
        }
      );
    } catch (e) {
      setBusy(false);
      setErr(
        e instanceof Error
          ? e.message
          : 'Could not start payment. Deploy Cloud Functions?'
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Checkout</Text>
      <Text style={styles.muted}>
        5% platform fee + 18% GST on fee. Vendor listing stays free.
      </Text>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text style={styles.vname}>{vendorName}</Text>
          <Text style={styles.row}>Service: {service}</Text>
          <Text style={styles.row}>Event: {eventDate}</Text>
        </Card.Content>
      </Card>
      <View style={styles.table}>
        <Row label="Vendor price" value={`₹${amount.toLocaleString('en-IN')}`} />
        <Row
          label="Platform fee (5%)"
          value={`₹${breakdown.commission.toLocaleString('en-IN')}`}
        />
        <Row
          label="GST (18% on fee)"
          value={`₹${breakdown.gst.toLocaleString('en-IN')}`}
        />
        <View style={styles.line} />
        <Row
          label="Total"
          value={`₹${breakdown.totalCharged.toLocaleString('en-IN')}`}
          bold
        />
      </View>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      {busy ? <ActivityIndicator color={ORANGE} style={{ marginVertical: 12 }} /> : null}
      <Button
        mode="contained"
        buttonColor={ORANGE}
        onPress={pay}
        disabled={busy}
        style={styles.btn}
      >
        Pay now
      </Button>
      <Button mode="text" onPress={() => navigation.goBack()}>
        Back
      </Button>
    </ScrollView>
  );
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
  h1: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  muted: { color: '#666', marginTop: 6, marginBottom: 16 },
  card: { marginBottom: 20, backgroundColor: '#fffaf6' },
  vname: { fontSize: 18, fontWeight: '800', color: ORANGE, marginBottom: 8 },
  row: { color: '#444', marginBottom: 4 },
  table: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#f0d8cc' },
  r: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lbl: { color: '#555' },
  val: { color: '#111', fontWeight: '600' },
  b: { fontWeight: '800', color: ORANGE, fontSize: 16 },
  line: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  err: { color: '#b91c1c', marginBottom: 8 },
  btn: { marginTop: 8, paddingVertical: 4 },
});
