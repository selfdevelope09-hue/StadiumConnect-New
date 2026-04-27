import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card, SegmentedButtons, Surface } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { auth, db } from '@/config/firebase';
import { brand } from '@/config/appTheme';
import type { UserStackParamList } from '@/navigation/types';
import { openUPIApp } from '@/services/paymentService';
import {
  getVerificationMethod,
  submitPaymentProof,
  uploadPaymentProofImage,
  createBookingWithStages,
  getBusinessUpiId,
  UPI_BUSINESS_NAME,
  VERIFY_THRESHOLD,
} from '@/services/stagedPaymentService';
import type { StagedBookingRecord } from '@/types/stagedPayment';

const ORANGE = brand.primary;

/** Primary: PhonePe (2×2 order). */
const UPI_APPS = [
  { name: 'PhonePe', icon: 'cellphone' as const, app: 'phonepe' as const },
  { name: 'GPay', icon: 'google' as const, app: 'gpay' as const },
  { name: 'Paytm', icon: 'wallet' as const, app: 'paytm' as const },
  { name: 'BHIM', icon: 'bank' as const, app: 'bhim' as const },
] as const;

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
  const [payTab, setPayTab] = useState<'app' | 'qr'>('app');

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

  const onOpenUPIForApp = async (
    app: (typeof UPI_APPS)[number]['app']
  ) => {
    if (!bookingId || !row) {
      return;
    }
    if (Platform.OS === 'web') {
      setErr('Open the StadiumConnect app on your phone to use UPI.');
      return;
    }
    setErr(null);
    const desc = `S${row.stage} ${row.label}`.replace(/\s+/g, ' ').slice(0, 50);
    const ok = await openUPIApp(app, toPay, bookingId, desc);
    if (!ok) {
      setErr('Could not open a UPI app. Install PhonePe / GPay or use Scan QR.');
    }
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
    const uDigits = utr.replace(/\D/g, '');
    if (toPay >= VERIFY_THRESHOLD && uDigits.length !== 12) {
      setErr('Enter 12-digit UTR (PhonePe → History → transaction).');
      return;
    }
    if (uDigits.length < 8) {
      setErr('Enter a valid UTR or reference (8–12 digits).');
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

  const uDigits = utr.replace(/\D/g, '');
  const canSubmitUtr =
    !busy &&
    (toPay >= VERIFY_THRESHOLD
      ? uDigits.length === 12
      : uDigits.length >= 8);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {createdDemo ? (
        <Text style={styles.badge}>
          Demo booking created. Replace `assets/images/stadium-qr.png` with your
          PhonePe QR (optional: set EXPO_PUBLIC_BUSINESS_UPI_ID if VPA changes).
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
                  ? {
                      borderColor: ORANGE,
                      borderWidth: 2,
                      backgroundColor: '#fff',
                    }
                  : null,
            ]}
          />
        ))}
      </View>
      <Text style={styles.amtLine}>
        Pay <Text style={styles.amtINR}>₹{toPay.toLocaleString('en-IN')}</Text>
      </Text>
      <Text style={styles.mutedSmall}>{verify.instruction}</Text>
      <Text style={styles.mutedSmall}>{verify.adminAction}</Text>
      {toPay < VERIFY_THRESHOLD ? (
        <Text style={styles.badge2}>After pay: upload screenshot (&lt; ₹5,000)</Text>
      ) : (
        <Text style={styles.badge2}>
          After pay: 12-digit UTR (amount ≥ ₹
          {VERIFY_THRESHOLD.toLocaleString('en-IN')})
        </Text>
      )}

      <SegmentedButtons
        value={payTab}
        onValueChange={(v) => setPayTab(v as 'app' | 'qr')}
        style={styles.seg}
        buttons={[
          { value: 'app', label: 'Pay via App' },
          { value: 'qr', label: 'Scan QR' },
        ]}
      />

      {payTab === 'app' ? (
        <View>
          <Text style={styles.sub}>
            Open your app — {UPI_APPS[0].name} recommended
          </Text>
          <View style={styles.appGrid}>
            {UPI_APPS.map((a) => {
              const primary = a.app === 'phonepe';
              return (
                <Pressable
                  key={a.app}
                  onPress={() => void onOpenUPIForApp(a.app)}
                  style={({ pressed }) => [
                    styles.appTile,
                    primary && styles.appTilePrimary,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={styles.appEmoji}>
                    {a.app === 'phonepe'
                      ? '📱'
                      : a.app === 'gpay'
                        ? '🟢'
                        : a.app === 'paytm'
                          ? '🔵'
                          : '🇮🇳'}
                  </Text>
                  <MaterialCommunityIcons
                    name={a.icon}
                    size={26}
                    color={ORANGE}
                  />
                  <Text
                    style={[styles.appLabel, primary && styles.appLabelPrimary]}
                  >
                    {a.name}
                    {primary ? '  ★' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {Platform.OS !== 'web' ? (
            <Text style={styles.muted2}>
              Payee: {UPI_BUSINESS_NAME} · UPI: {getBusinessUpiId()}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.qrBlock}>
          <Text style={styles.sub}>Static PhonePe / UPI QR</Text>
          <View style={styles.qrContainer}>
            <Image
              source={require('../../../assets/images/stadium-qr.png')}
              style={styles.qrImage}
              resizeMode="contain"
            />
            <View style={styles.brandBox}>
              <Text style={styles.brandName}>🏟️ StadiumConnect</Text>
              <Text style={styles.brandSub}>Official Payment Account</Text>
              <Text style={styles.brandVerified}>✅ Verified Platform</Text>
            </View>
          </View>
          <Text style={styles.muted2}>
            Open any UPI app and scan. If amount is not pre-filled, enter:{' '}
            <Text style={styles.strong}>
              ₹{toPay.toLocaleString('en-IN')}
            </Text>
            {'\n'}
            UPI: {getBusinessUpiId()} · {UPI_APPS[0].name} recommended
          </Text>
        </View>
      )}

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text style={styles.h2}>
            {verify.ui === 'screenshot' ? 'After payment' : 'After payment (UTR)'}
          </Text>
          {verify.ui === 'screenshot' ? (
            <>
              <Text style={styles.muted2}>
                Payment kar diya? Screenshot upload karo. {verify.instruction}
              </Text>
              {busy ? (
                <ActivityIndicator color={ORANGE} />
              ) : (
                <Button
                  mode="outlined"
                  textColor={ORANGE}
                  onPress={onUploadShot}
                  style={styles.gap}
                >
                  Upload screenshot
                </Button>
              )}
              <Text style={styles.proofNote}>
                · Verification within 2 hours
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.muted2}>
                UTR number enter karo. PhonePe → History → transaction → UTR
                number.
              </Text>
              <TextInput
                value={utr}
                onChangeText={setUtr}
                placeholder="12-digit UTR"
                keyboardType="number-pad"
                maxLength={12}
                style={styles.inp}
              />
              <Button
                mode="contained"
                buttonColor={ORANGE}
                onPress={onSubmitUtr}
                disabled={!canSubmitUtr}
              >
                {busy ? 'Submitting...' : 'Submit for verification'}
              </Button>
              <Text style={styles.proofNote}>
                · Priority verification within 30 minutes
              </Text>
            </>
          )}
        </Card.Content>
      </Card>
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Surface style={styles.note} elevation={0}>
        <Text style={styles.muted2}>
          VPA: {getBusinessUpiId()} — pending until admin confirms.
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
  amtINR: { fontSize: 28, fontWeight: '800', color: ORANGE },
  sub: { fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 6 },
  gap: { marginBottom: 8 },
  seg: { marginTop: 12, marginBottom: 8 },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 8,
  },
  appTile: {
    width: '48%',
    minHeight: 88,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTilePrimary: {
    borderColor: ORANGE,
    borderWidth: 2,
    backgroundColor: '#fff8f2',
  },
  appLabel: { fontSize: 12, textAlign: 'center', fontWeight: '600', marginTop: 2 },
  appLabelPrimary: { color: ORANGE },
  appEmoji: { fontSize: 16, marginBottom: 2 },
  qrContainer: { alignItems: 'center', marginTop: 8 },
  qrImage: { width: 280, height: 280, borderRadius: 8, backgroundColor: '#fff' },
  qrBlock: { marginTop: 4, marginBottom: 8 },
  brandBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff8f2',
    borderWidth: 1,
    borderColor: '#cfe7ff',
    width: '100%',
    maxWidth: 320,
  },
  brandName: { fontSize: 18, fontWeight: '800', textAlign: 'center', color: ORANGE },
  brandSub: { fontSize: 13, textAlign: 'center', color: '#4f6f8d', marginTop: 4 },
  brandVerified: { fontSize: 12, textAlign: 'center', color: '#16a34a', marginTop: 8, fontWeight: '600' },
  strong: { fontWeight: '800', color: ORANGE },
  proofNote: { fontSize: 11, color: '#94a3b8', marginTop: 8 },
  amtLine: { fontSize: 18, marginTop: 8 },
  card: { marginTop: 8, backgroundColor: '#f5faff' },
  inp: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  err: { color: '#b91c1c', marginTop: 8 },
  muted: { color: '#4f6f8d' },
  muted2: { color: '#4f6f8d', fontSize: 12, lineHeight: 18 },
  mutedSmall: { color: '#888', fontSize: 12, marginTop: 2 },
  badge: { color: ORANGE, fontSize: 12, marginBottom: 8, fontWeight: '600' },
  badge2: { fontSize: 11, color: ORANGE, marginTop: 6 },
  note: { padding: 12, backgroundColor: '#f8f8f8', borderRadius: 8, marginTop: 12 },
});
