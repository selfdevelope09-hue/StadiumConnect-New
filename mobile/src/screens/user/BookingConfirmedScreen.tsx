import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { doc, getDoc } from 'firebase/firestore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import LottieView from 'lottie-react-native';

import { db } from '@/config/firebase';
import { brand } from '@/config/appTheme';
import type { UserStackParamList } from '@/navigation/types';

const ORANGE = brand.primary;
const LOTTIE =
  'https://assets2.lottiefiles.com/packages/lf20_puciaact.json';

type R = RouteProp<UserStackParamList, 'BookingConfirmed'>;

function htmlReceipt(p: {
  bookingId: string;
  paymentId: string;
  orderId: string;
  vendorName: string;
  amount: number;
  contact?: string;
  email?: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
body { font-family: system-ui, sans-serif; padding: 24px; color: #0e2a47; }
h1 { color: #FF6B35; } .row { margin: 8px 0; } .muted { color: #4f6f8d; }
</style></head><body>
<h1>StadiumConnect</h1>
<p class="muted">Booking receipt</p>
<div class="row"><b>Booking ID</b> ${p.bookingId}</div>
<div class="row"><b>Order ID</b> ${p.orderId}</div>
<div class="row"><b>Payment ID</b> ${p.paymentId}</div>
<div class="row"><b>Vendor</b> ${p.vendorName}</div>
${p.email ? `<div class="row"><b>Vendor email</b> ${p.email}</div>` : ''}
${p.contact ? `<div class="row"><b>Contact</b> ${p.contact}</div>` : ''}
<div class="row"><b>Total paid</b> ₹${p.amount.toLocaleString('en-IN')}</div>
</body></html>`;
}

export function BookingConfirmedScreen() {
  const nav =
    useNavigation<NativeStackNavigationProp<UserStackParamList, 'BookingConfirmed'>>();
  const route = useRoute<R>();
  const {
    bookingId,
    paymentId,
    orderId,
    vendorName,
    amount,
    vendorId,
  } = route.params;
  const [phone, setPhone] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'vendors', vendorId));
      const d = snap.data() as
        | { phone?: string; contact?: string; email?: string }
        | undefined;
      if (d) {
        setPhone(d.phone ?? d.contact ?? null);
        setEmail(d.email ?? null);
      }
    })();
  }, [vendorId]);

  const onDownload = useCallback(async () => {
    const { uri } = await Print.printToFileAsync({
      html: htmlReceipt({
        bookingId,
        paymentId,
        orderId,
        vendorName,
        amount,
        contact: phone ?? undefined,
        email: email ?? undefined,
      }),
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Receipt',
      });
    }
  }, [amount, bookingId, email, orderId, paymentId, phone, vendorName]);

  const onTrack = useCallback(() => {
    nav.navigate('Bookings');
  }, [nav]);

  const onShare = useCallback(() => {
    void Share.share({
      message: `StadiumConnect booking ${bookingId} — ${vendorName}. Paid ₹${amount.toLocaleString('en-IN')}.`,
    });
  }, [amount, bookingId, vendorName]);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {Platform.OS === 'web' ? (
        <View style={styles.lottieW}>
          <Text style={styles.check}>✓</Text>
        </View>
      ) : (
        <LottieView
          source={{ uri: LOTTIE }}
          style={styles.lottie}
          autoPlay
          loop={false}
        />
      )}
      <Text style={styles.h1}>Booking confirmed</Text>
      <Text style={styles.muted}>
        You will receive a push notification. Save this ID for your records.
      </Text>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text style={styles.label}>Booking ID</Text>
          <Text style={styles.id} selectable>
            {bookingId}
          </Text>
          <View style={styles.gap} />
          <Text style={styles.label}>Vendor</Text>
          <Text style={styles.v}>{vendorName}</Text>
          {(phone || email) && (
            <>
              <Text style={styles.label}>Vendor contact</Text>
              {phone ? <Text selectable>{phone}</Text> : null}
              {email ? <Text selectable>{email}</Text> : null}
            </>
          )}
          <Text style={styles.label}>Paid</Text>
          <Text style={styles.paid}>
            ₹{amount.toLocaleString('en-IN')}
          </Text>
        </Card.Content>
      </Card>
      <Button
        mode="contained"
        buttonColor={ORANGE}
        onPress={onDownload}
        style={styles.btn}
      >
        Download receipt
      </Button>
      <Button
        mode="outlined"
        onPress={onTrack}
        textColor={ORANGE}
        style={styles.btn}
      >
        Track booking
      </Button>
      <Button mode="text" onPress={onShare} textColor={ORANGE}>
        Share
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 40, alignItems: 'stretch' },
  lottie: { width: 200, height: 200, alignSelf: 'center' },
  lottieW: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { fontSize: 120, color: ORANGE, fontWeight: '800' },
  h1: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: '#0e2a47',
  },
  muted: { textAlign: 'center', color: '#4f6f8d', marginTop: 8, marginBottom: 16 },
  card: { backgroundColor: '#f5faff', marginBottom: 20 },
  label: { color: '#888', fontSize: 12, marginTop: 8 },
  id: { fontSize: 16, fontWeight: '700' },
  v: { fontSize: 16, fontWeight: '600' },
  paid: { fontSize: 20, fontWeight: '800', color: ORANGE },
  gap: { height: 4 },
  btn: { marginBottom: 8 },
});
