import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip, Text as PaperText } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getAIVendorRecommendations } from '@/services/aiVendorService';
import { useAuthStore } from '@/store/authStore';
import { navigationRef } from '@/navigation/navigationRef';
import type { AIGeminiResult, AIVendorFormInput, AIVendorRecord } from '@/types/aiVendor';

import { EVENT_TYPES, SERVICE_TYPES, AI_PURPLE } from './aiConstants';
import { AIResultsCard } from './AIResultsCard';
import { ShimmerText } from './ShimmerText';

const TOTAL_STEPS = 5;
const BOTTOM_PAD = 24;

export type AIVendorSheetRef = { present: () => void; dismiss: () => void };

type InnerProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
};

function AIVendorSheetInner({ sheetRef }: InnerProps) {
  const insets = useSafeAreaInsets();
  const role = useAuthStore((s) => s.role);
  const [step, setStep] = useState(1);
  const [phase, setPhase] = useState<'form' | 'loading' | 'results' | 'error'>('form');
  const [budget, setBudget] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('');
  const [special, setSpecial] = useState('');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AIGeminiResult | null>(null);
  const [vendorsUsed, setVendorsUsed] = useState<AIVendorRecord[]>([]);
  const [locLoading, setLocLoading] = useState(false);

  const reset = useCallback(() => {
    setStep(1);
    setPhase('form');
    setBudget('');
    setServiceType('');
    setLocation('');
    setEventType('');
    setSpecial('');
    setErrMsg(null);
    setResult(null);
    setVendorsUsed([]);
  }, []);

  const onDismiss = useCallback(() => {
    reset();
  }, [reset]);

  const vendorMap = useMemo(() => {
    const m = new Map<string, AIVendorRecord>();
    for (const v of vendorsUsed) {
      m.set(v.id, v);
    }
    return m;
  }, [vendorsUsed]);

  const userInput: AIVendorFormInput = useMemo(
    () => ({
      budget,
      serviceType,
      location,
      eventType,
      specialRequirements: special,
    }),
    [budget, serviceType, location, eventType, special]
  );

  const onFindVendors = async () => {
    setErrMsg(null);
    setPhase('loading');
    const r = await getAIVendorRecommendations(userInput);
    if (r.success) {
      setResult(r.data);
      setVendorsUsed(r.vendorsUsed);
      setPhase('results');
    } else {
      setErrMsg(r.error);
      setVendorsUsed(r.vendorsUsed);
      setPhase('error');
    }
  };

  const onUseLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location', 'Allow location to auto-fill the area field.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (geo) {
        const parts = [geo.district, geo.subregion, geo.city, geo.region].filter(
          Boolean
        ) as string[];
        setLocation(parts.slice(0, 2).join(', ') || geo.city || '');
      }
    } catch {
      Alert.alert('Location', 'Could not resolve address. Type your area instead.');
    } finally {
      setLocLoading(false);
    }
  };

  const goViewProfile = (vendorId: string) => {
    sheetRef.current?.dismiss();
    if (role === 'user') {
      if (navigationRef.isReady()) {
        const nav = navigationRef as {
          navigate: (n: string, p?: Record<string, string | undefined>) => void;
        };
        nav.navigate('VendorDetail', { id: vendorId });
      }
    } else {
      Alert.alert(
        'Customer booking',
        'Open the app as a customer to view vendor profiles and book. Vendor ID: ' + vendorId
      );
    }
  };

  const goBook = (vendorId: string) => {
    sheetRef.current?.dismiss();
    if (role === 'user') {
      if (navigationRef.isReady()) {
        const nav = navigationRef as {
          navigate: (n: string, p?: Record<string, string | undefined>) => void;
        };
        nav.navigate('BookingForm', { vendorId });
      }
    } else {
      Alert.alert(
        'Bookings',
        'Use the main customer app flow to book. Vendor ID: ' + vendorId
      );
    }
  };

  const canNext = useMemo(() => {
    if (step === 1) {
      return budget.trim().length > 0;
    }
    if (step === 2) {
      return serviceType.length > 0;
    }
    if (step === 3) {
      return true;
    }
    if (step === 4) {
      return eventType.length > 0;
    }
    if (step === 5) {
      return (
        budget.trim().length > 0 &&
        serviceType.length > 0 &&
        eventType.length > 0
      );
    }
    return true;
  }, [step, budget, serviceType, eventType]);

  const renderBackdrop = useCallback(
    (props: ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const topPickId = result?.myRecommendation?.vendorId;

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={['92%']}
      onDismiss={onDismiss}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      topInset={insets.top}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + BOTTOM_PAD,
          paddingHorizontal: 18,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {phase === 'form' && (
          <>
            <Text style={styles.title}>🤖 AI vendor finder</Text>
            <Text style={styles.sub}>
              Step {step} of {TOTAL_STEPS}
            </Text>

            {step === 1 && (
              <View>
                <PaperText style={styles.lbl}>What is your budget? (₹)</PaperText>
                <View style={styles.budgetRow}>
                  <Text style={styles.rupee}>₹</Text>
                  <TextInput
                    style={styles.budgetInp}
                    placeholder="e.g. 150000 or 50k-2L"
                    placeholderTextColor="#6b6b7a"
                    value={budget}
                    onChangeText={setBudget}
                    keyboardType="default"
                  />
                </View>
              </View>
            )}

            {step === 2 && (
              <View>
                <PaperText style={styles.lbl}>Service type</PaperText>
                <View style={styles.chipWrap}>
                  {SERVICE_TYPES.map((s) => {
                    const sel = serviceType === s;
                    return (
                      <Chip
                        key={s}
                        style={[styles.chip, sel && styles.chipSel]}
                        textStyle={{ color: sel ? '#fff' : '#c8c8d8' }}
                        mode="outlined"
                        selected={sel}
                        onPress={() => setServiceType(s)}
                        selectedColor={AI_PURPLE}
                      >
                        {s}
                      </Chip>
                    );
                  })}
                </View>
              </View>
            )}

            {step === 3 && (
              <View>
                <PaperText style={styles.lbl}>Location / area</PaperText>
                <TextInput
                  style={styles.textInp}
                  placeholder="Mumbai, Bandra, etc."
                  placeholderTextColor="#6b6b7a"
                  value={location}
                  onChangeText={setLocation}
                />
                <Button
                  mode="outlined"
                  textColor={AI_PURPLE}
                  onPress={onUseLocation}
                  loading={locLoading}
                  style={{ marginTop: 8 }}
                >
                  Use my location
                </Button>
              </View>
            )}

            {step === 4 && (
              <View>
                <PaperText style={styles.lbl}>Event type</PaperText>
                <View style={styles.chipWrap}>
                  {EVENT_TYPES.map((e) => {
                    const sel = eventType === e;
                    return (
                      <Chip
                        key={e}
                        style={[styles.chip, sel && styles.chipSel]}
                        textStyle={{ color: sel ? '#fff' : '#c8c8d8' }}
                        mode="outlined"
                        selected={sel}
                        onPress={() => setEventType(e)}
                        selectedColor={AI_PURPLE}
                      >
                        {e}
                      </Chip>
                    );
                  })}
                </View>
              </View>
            )}

            {step === 5 && (
              <View>
                <PaperText style={styles.lbl}>
                  Special requirements (optional)
                </PaperText>
                <TextInput
                  style={[styles.textInp, { minHeight: 100 }]}
                  placeholder="Diet, theme, access, etc."
                  placeholderTextColor="#6b6b7a"
                  value={special}
                  onChangeText={setSpecial}
                  multiline
                />
                <Text style={styles.hint}>
                  We’ll ask Gemini to read this together with your budget and area.
                </Text>
              </View>
            )}

            <View style={styles.navRow}>
              {step > 1 ? (
                <Button
                  mode="text"
                  textColor="#a8a8c0"
                  onPress={() => setStep((s) => Math.max(1, s - 1))}
                >
                  Back
                </Button>
              ) : (
                <View style={{ width: 80 }} />
              )}
              {step < TOTAL_STEPS ? (
                <Button
                  mode="contained"
                  buttonColor={AI_PURPLE}
                  disabled={!canNext}
                  onPress={() => setStep((s) => s + 1)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  mode="contained"
                  buttonColor={AI_PURPLE}
                  disabled={!canNext}
                  onPress={onFindVendors}
                >
                  Find best vendors 🤖
                </Button>
              )}
            </View>
          </>
        )}

        {phase === 'loading' && (
          <View style={styles.centerBlock}>
            <Text style={styles.loadTitle}>AI is analyzing vendors…</Text>
            <ShimmerText>
              Comparing value, reviews, and fit for your event
            </ShimmerText>
            <LoadingDots />
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.centerBlock}>
            <Text style={styles.errTitle}>Something went wrong</Text>
            <Text style={styles.errBody}>{errMsg}</Text>
            {vendorsUsed.length === 0 && errMsg && (
              <Text style={styles.hint2}>
                Double-check that your Firestore `vendors` collection has documents
                with `serviceType`, `minPrice`, and `isActive: true` where possible.
              </Text>
            )}
            <Button
              mode="contained"
              buttonColor={AI_PURPLE}
              onPress={() => {
                setPhase('form');
                setStep(1);
                setErrMsg(null);
              }}
            >
              Try again
            </Button>
            <Pressable
              onPress={() => {
                if (vendorsUsed.length) {
                  setPhase('form');
                }
              }}
            >
              <Text style={styles.backLink}>
                {vendorsUsed.length ? 'Back to form' : ''}
              </Text>
            </Pressable>
          </View>
        )}

        {phase === 'results' && result && (
          <View>
            <Text style={styles.title}>Your matches</Text>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>{result.summary}</Text>
            </View>
            {result.myRecommendation && (
              <View style={styles.pickedSection}>
                <Text style={styles.pickedLabel}>My recommendation</Text>
                <View style={styles.pickedTextBox}>
                  <Text style={styles.pickedName}>
                    {vendorMap.get(result.myRecommendation.vendorId)?.name ||
                      result.myRecommendation.vendorId}
                  </Text>
                  <Text style={styles.pickedReason}>
                    {result.myRecommendation.reason}
                  </Text>
                  <Text style={styles.pickedTip}>
                    💡 {result.myRecommendation.tips}
                  </Text>
                </View>
              </View>
            )}
            <PaperText style={styles.sectionH}>Top 3 for you</PaperText>
            {result.recommendations
              .slice(0, 3)
              .map((rec) => (
                <AIResultsCard
                  key={rec.rank + rec.vendorId}
                  rec={rec}
                  vendor={vendorMap.get(rec.vendorId)}
                  isTopPick={rec.vendorId === topPickId}
                  onViewProfile={goViewProfile}
                  onBook={goBook}
                />
              ))}
            <Button
              mode="outlined"
              textColor={AI_PURPLE}
              onPress={() => {
                reset();
                setPhase('form');
              }}
              style={{ marginTop: 8 }}
            >
              New search
            </Button>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function LoadingDots() {
  return (
    <View style={styles.dotsRow}>
      {[0, 1, 2].map((i) => (
        <LoadingDot key={i} delay={i * 200} />
      ))}
    </View>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  const o = useSharedValue(0.4);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.4, { duration: 400 })
        ),
        -1,
        false
      )
    );
  }, [delay, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

export const AIVendorSheet = forwardRef<AIVendorSheetRef, object>(
  function AIVendorSheet(_props, ref) {
    const r = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => ({
      present: () => r.current?.present(),
      dismiss: () => r.current?.dismiss(),
    }));
    return <AIVendorSheetInner sheetRef={r} />;
  }
);

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#0e0e16' },
  handle: { backgroundColor: '#4a4a5c', width: 40 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  sub: { color: '#8b8ba0', marginBottom: 20 },
  lbl: { color: '#c8c8d8', marginBottom: 8, fontSize: 15, fontWeight: '600' },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rupee: { color: '#fff', fontSize: 20, fontWeight: '700', paddingLeft: 14 },
  budgetInp: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    paddingVertical: 14,
    paddingRight: 14,
  },
  textInp: {
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    padding: 12,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 0, backgroundColor: 'transparent', borderColor: '#4a4a5c' },
  chipSel: { backgroundColor: 'rgba(108,99,255,0.35)', borderColor: AI_PURPLE },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
  },
  hint: { color: '#6b6b7a', marginTop: 8, fontSize: 13, lineHeight: 18 },
  hint2: { color: '#6b6b7a', marginTop: 12, textAlign: 'center' },
  centerBlock: { paddingVertical: 40, alignItems: 'center' },
  loadTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  errTitle: { color: '#f87171', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  errBody: { color: '#d4d4e4', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  backLink: { color: AI_PURPLE, marginTop: 16, textAlign: 'center' },
  summaryBox: {
    backgroundColor: 'rgba(108,99,255,0.12)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryText: { color: '#e0e0f0', lineHeight: 22 },
  pickedSection: { marginBottom: 20 },
  pickedLabel: { color: AI_PURPLE, fontWeight: '800', marginBottom: 6 },
  pickedTextBox: { backgroundColor: '#1a1a24', padding: 12, borderRadius: 12 },
  pickedName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  pickedReason: { color: '#c8c8d8', marginTop: 8, lineHeight: 20 },
  pickedTip: { color: '#a8a8c0', marginTop: 8, lineHeight: 20 },
  sectionH: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 20 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AI_PURPLE,
    opacity: 0.8,
  },
});
