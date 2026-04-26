import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card, Divider, Surface } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { auth, db } from '@/config/firebase';
import { brand } from '@/config/appTheme';
import type { UserStackParamList } from '@/navigation/types';
import {
  getVerificationMethod,
  submitPaymentProof,
  buildUpiIntentUrl,
  uploadPaymentProofImage,
  createBookingWithStages,
  getBusinessUpiId,
  UPI_BUSINESS_NAME,
  VERIFY_THRESHOLD,
} from '@/services/stagedPaymentService';
import type { StagedBookingRecord } from '@/types/stagedPayment';

const ORANGE = brand.primary;

const UPI_APPS = [
  { name: 'GPay', icon: 'google' as const, scheme: 'gpay' },
  { name: 'PhonePe', icon: 'cellphone' as const, scheme: 'phonepe' },
  { name: 'Paytm', icon: 'wallet' as const, scheme: 'paytm' },
  { name: 'BHIM', icon: 'bank' as const, scheme: 'bhim' },
];

type Nav = NativeStackNavigationProp<UserStackParamList, 'UPIPayment'>;
type R = RouteProp<UserStackParamList, 'UPIPayment'>;

export function UPIPaymentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const p = route.params;
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState(p.bookingId ?? '');
  const [stageIndex, setStageIndex] = useState(
    p.stageIndex !== undefined ? p.stageIndex : 0
  );
  const [booking, setBooking] = useState<StagedBookingRecord | null>(null);
  const [utr, setUtr] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createdDemo, setCreatedDemo] = useState(false);

  const load = useCallback(
    async (bid: string, overrideStageIndex?: number) => {
    const s = await getDoc(doc(db, 'bookings', bid));
    if (!s.exists()) {
      setErr('Booking not found');
      return;
    }
    const d = s.data() as StagedBookingRecord;
    if (d.paymentModel !== 'upi_staged') {
      setErr('This booking is not UPI-staged');
      return;
    }
    setBooking(d);
    if (typeof overrideStageIndex === 'number') {
      setStageIndex(overrideStageIndex);
    } else {
      const c = d.currentStageIndex;
      if (typeof c === 'number' && c >= 0) {
        setStageIndex(c);
      }
    }
    setErr(null);
  },
  []
  );

  useEffect(() => {
    (async () => {
      if (!p.bookingId && p.totalAmount && p.vendorId && p.vendorName) {
        setLoading(true);
        const u = auth.currentUser;
        if (!u) {
          setErr('Sign in first');
          setLoading(false);
          return;
        }
        const id = await createBookingWithStages(
          {
            userId: u.uid,
            vendorId: p.vendorId,
            vendorName: p.vendorName,
            service: p.service,
            eventDate: p.eventDate,
          },
          p.category || 'caterer',
          p.totalAmount
        );
        setBookingId(id);
        setCreatedDemo(true);
        setStageIndex(0);
        await load(id);
        setLoading(false);
        return;
      }
      if (p.bookingId) {
        setLoading(true);
        await load(p.bookingId, p.stageIndex);
        if (p.stageIndex !== undefined) {
          setStageIndex(p.stageIndex);
        }
        setLoading(false);
        return;
      }
      setLoading(false);
    })();
  }, [p, load]);

  const row = booking?.paymentStages[stageIndex];
  const toPay = row?.amount ?? 0;
  const verify = getVerificationMethod(toPay);
  const nStages = booking?.paymentStages.length ?? 0;

  const onOpenUpi = () => {
    if (!bookingId) {
      return;
    }
    const url = buildUpiIntentUrl(toPay, bookingId, stageIndex);
    if (Platform.OS === 'web') {
      setErr('Open the StadiumConnect app on your phone, or use QR below.');
    }
    void Linking.openURL(url);
  };

  const onUploadShot = async () => {
    if (!bookingId) {
      return;
    }
    setBusy(true);
    setErr(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErr('Photo permission needed');
      setBusy(false);
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (r.canceled) {
      setBusy(false);
      return;
    }
    const asset = r.assets[0];
    try {
      const url = await uploadPaymentProofImage(
        bookingId,
        stageIndex,
        asset.uri,
        asset.mimeType || 'image/jpeg'
      );
      await submitPaymentProof(bookingId, stageIndex, {
        type: 'screenshot',
        value: url,
        amount: toPay,
      });
      await load(bookingId);
      setBusy(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
      setBusy(false);
    }
  };

  const onSubmitUtr = async () => {
    if (!bookingId) {
      return;
    }
    if (utr.replace(/\D/g, '').length < 8) {
      setErr('Enter a valid UTR / reference (usually 8–12 digits)');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await submitPaymentProof(bookingId, stageIndex, {
        type: 'utr',
        value: utr.trim(),
        amount: toPay,
      });
      setUtr('');
      await load(bookingId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  if (!booking && !p.totalAmount) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>
          No booking. Pass `bookingId` in navigation or open with totalAmount +
          vendor to create a staged UPI booking.
        </Text>
        <Button onPress={() => navigation.goBack()}>Back</Button>
      </View>
    );
  }

  if (!row || !booking) {
    return (
      <View style={styles.center}>
        <Text>Invalid stage</Text>
        <Button onPress={() => navigation.goBack()}>Back</Button>
      </View>
    );
  }

  if (row.amount <= 0 || row.status === 'waived') {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>
          This stage has no payment. Go to next stage.
        </Text>
        <Button
          onPress={() =>
            setStageIndex((i) => Math.min(i + 1, nStages - 1))
          }
        >
          Next stage
        </Button>
      </View>
    );
  }

  if (
    row.status === 'proof_submitted' ||
    row.status === 'verifying' ||
    row.status === 'paid'
  ) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>
          {row.status === 'paid' ? 'Stage paid' : 'Verification pending ⏳'}
        </Text>
        <Text style={styles.muted}>
          {row.status === 'paid'
            ? 'This stage is confirmed.'
            : 'Admin is verifying your UPI payment. We will notify you soon.'}
        </Text>
        {createdDemo ? null : null}
        <Button
          mode="contained"
          buttonColor={ORANGE}
          onPress={() => navigation.navigate('BookingTracking', { bookingId })}
        >
          Open booking tracker
        </Button>
        <Button onPress={() => navigation.goBack()}>Back</Button>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {createdDemo ? (
        <Text style={styles.badge}>
          Demo booking created — set EXPO_PUBLIC_BUSINESS_UPI_ID in .env
        </Text>
      ) : null}
      <Text style={styles.h1}>UPI payment</Text>
      <Text style={styles.stageN}>
        Stage {row.stage} of {nStages} — {row.label}
      </Text>
      <View style={styles.pBar}>
        {booking.paymentStages.map((s, i) => (
          <View
            key={s.stage}
            style={[
              styles.dot,
              s.status === 'paid' || s.status === 'waived'
                ? styles.dotOn
                : i === stageIndex
                  ? { borderColor: ORANGE, borderWidth: 2, backgroundColor: '#fff' }
                  : null,
            ]}
          />
        ))}
      </View>
      <Text style={styles.amt}>
        Pay now:{' '}
        <Text style={styles.amtINR}>₹{toPay.toLocaleString('en-IN')}</Text>
      </Text>
      <Text style={styles.mutedSmall}>{verify.instruction}</Text>
      <Text style={styles.mutedSmall}>{verify.adminAction}</Text>
      {toPay < VERIFY_THRESHOLD ? (
        <Text style={styles.badge2}>Screenshot path (&lt; ₹5,000)</Text>
      ) : (
        <Text style={styles.badge2}>
          UTR / reference (amount ≥ ₹{VERIFY_THRESHOLD.toLocaleString('en-IN')})
        </Text>
      )}

      <Text style={styles.sub}>A — UPI app</Text>
      <Button mode="contained" buttonColor={ORANGE} onPress={onOpenUpi} style={styles.gap}>
        Open UPI (default app) — {getBusinessUpiId()}
      </Button>
      <View style={styles.appRow}>
        {UPI_APPS.map((a) => (
          <Pressable
            key={a.name}
            onPress={onOpenUpi}
            style={({ pressed }) => [styles.appChip, pressed && { opacity: 0.7 }]}
          >
            <MaterialCommunityIcons name={a.icon} size={28} color={ORANGE} />
            <Text style={styles.appTxt}>{a.name}</Text>
          </Pressable>
        ))}
      </View>
      {Platform.OS !== 'web' && (
        <Text style={styles.muted2}>
          Same link opens your default UPI / bank on this device.{' '}
          {UPI_BUSINESS_NAME} • {getBusinessUpiId()}
        </Text>
      )}

      <Divider style={styles.div} />
      <Text style={styles.sub}>B — Scan QR (static business QR)</Text>
      <Text style={styles.muted2}>
        Bank app: scan the QR saved as `stadium-upi-qr.png` in assets, or print
        your company static QR, then add the image in `assets/stadium-upi-qr.png`.
      </Text>
      <View style={styles.qrPl}>
        <View style={styles.qrF}>
          <MaterialCommunityIcons name="qrcode" size={100} color="#ccc" />
          <Text style={styles.muted2}>
            Add your static UPI QR as `stadium-upi-qr.png` in mobile/assets, then
            use Image here.
          </Text>
        </View>
      </View>

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text style={styles.h2}>
            {verify.ui === 'screenshot' ? 'After payment' : 'After payment (UTR)'}
          </Text>
          {verify.ui === 'screenshot' ? (
            <>
              <Text style={styles.muted2}>
                Screenshot upload karo — {verify.instruction}
              </Text>
              {busy ? (
                <ActivityIndicator color={ORANGE} />
              ) : (
                <Button mode="outlined" textColor={ORANGE} onPress={onUploadShot}>
                  Screenshot upload karo
                </Button>
              )}
            </>
          ) : (
            <>
              <Text style={styles.muted2}>
                {verify.instruction}
              </Text>
              <TextInput
                value={utr}
                onChangeText={setUtr}
                placeholder="12-digit UTR / bank ref"
                keyboardType="number-pad"
                style={styles.inp}
              />
              <Button
                mode="contained"
                buttonColor={ORANGE}
                onPress={onSubmitUtr}
                disabled={busy}
              >
                {busy ? 'Submitting...' : 'Submit UTR'}
              </Button>
            </>
          )}
        </Card.Content>
      </Card>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Surface style={styles.note} elevation={0}>
        <Text style={styles.muted2}>
          Status: Verification pending ⏳ until admin confirms. Business VPA:{' '}
          {getBusinessUpiId()}
        </Text>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  scroll: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: '800', color: ORANGE },
  h2: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  stageN: { fontSize: 16, fontWeight: '600', marginTop: 4, marginBottom: 12 },
  pBar: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e5e5e5' },
  dotOn: { backgroundColor: ORANGE },
  amt: { fontSize: 18, marginTop: 8 },
  amtINR: { fontSize: 28, fontWeight: '800', color: ORANGE },
  sub: { fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 6 },
  gap: { marginBottom: 8 },
  appRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  appChip: {
    width: 78,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0c8b0',
    alignItems: 'center',
  },
  appTxt: { fontSize: 10, textAlign: 'center' },
  qrPl: { alignItems: 'center', marginVertical: 12 },
  qr: { width: 200, height: 200 },
  qrF: { width: 200, height: 200, borderWidth: 1, borderColor: '#eee', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  card: { marginTop: 8, backgroundColor: '#fffaf6' },
  div: { marginVertical: 16 },
  inp: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  err: { color: '#b91c1c', marginTop: 8 },
  muted: { color: '#666' },
  muted2: { color: '#666', fontSize: 12, lineHeight: 18 },
  mutedSmall: { color: '#888', fontSize: 12, marginTop: 2 },
  badge: { color: ORANGE, fontSize: 12, marginBottom: 8, fontWeight: '600' },
  badge2: { fontSize: 11, color: ORANGE, marginTop: 6 },
  note: { padding: 12, backgroundColor: '#f8f8f8', borderRadius: 8, marginTop: 12 },
});
