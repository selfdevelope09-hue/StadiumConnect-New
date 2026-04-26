import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Chip } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { navigationRef } from '@/navigation/navigationRef';
import type { FireVendor } from '@/services/aiChatService';
import {
  fetchVendorsFromFirestore,
  getAIRecommendations,
  runFreeFormChat,
} from '@/services/aiChatService';
import type {
  ChatStep,
  Message,
  ResultMessage,
  TextMessage,
  UserPreferences,
  AIVendorResultPayload,
} from '@/types/aiChat';

import { ChatMessageBubble, TypingIndicator } from './ChatMessage';

const ORANGE = '#FF6B35';
const ORANGE_2 = '#FF8C42';
const ORANGE_LIGHT = '#FFF0EA';
const BG = '#FFFFFF';
const TEXT = '#333333';

const OPENING =
  'Namaste! 🙏 Main hoon aapka StadiumConnect AI Assistant!\nAapko kaunsi service chahiye?';

const Q_CATEGORY = [
  '🎨 Decorator',
  '📸 Photographer',
  '🍽️ Caterer',
  '🎵 Band Baja',
  '🏛️ Venue',
  '✨ Full Event Package',
];
const Q_CITY = [
  '📍 Nagpur',
  '📍 Mumbai',
  '📍 Pune',
  '📍 Delhi',
  '📍 Pandharkawada',
  '📍 Warora',
  '📍 Other (type करें)',
];
const Q_BUDGET = [
  '💰 Under ₹10,000',
  '💰 ₹10K - ₹50K',
  '💰 ₹50K - ₹1L',
  '💰 ₹1L - ₹5L',
  '💰 ₹5L+',
  '💰 Custom (type करें)',
];
const Q_DATE = [
  '📅 This Week',
  '📅 This Month',
  '📅 Within 3 Months',
  '📅 6+ Months Later',
  '📅 Not Sure Yet',
];
const Q_EXTRAS = [
  '⭐ Top Rated Only',
  '💎 Premium Quality',
  '🏆 Most Reviews',
  '✅ Skip - Show Results',
];
const Q_AFTER = [
  '🔄 Refine Search',
  '📞 Contact help',
  '🔍 See all vendors',
  '💬 Ask anything',
];

type Props = { visible: boolean; onClose: () => void };
let _mid = 0;
const mid = () => `m${++_mid}_${Date.now()}`;

const emptyPrefs = (): UserPreferences => ({
  category: '',
  city: '',
  budget: '',
  eventDate: '',
  specialReq: '',
});

export function AIChatModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [currentStep, setCurrentStep] = useState<ChatStep>('category');
  const [prefs, setPrefs] = useState<UserPreferences>(emptyPrefs);
  const [messages, setMessages] = useState<Message[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>(Q_CATEGORY);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState('');
  const [afterResults, setAfterResults] = useState(false);
  const [lastVendors, setLastVendors] = useState<FireVendor[]>([]);

  const reset = useCallback(() => {
    setCurrentStep('category');
    setPrefs(emptyPrefs());
    setMessages([]);
    setQuickReplies(Q_CATEGORY);
    setIsTyping(false);
    setInput('');
    setAfterResults(false);
    setLastVendors([]);
  }, []);

  useEffect(() => {
    if (visible) {
      reset();
      setMessages([{ id: mid(), role: 'ai', text: OPENING }]);
    }
  }, [visible, reset]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const addUser = useCallback(
    (t: string) => {
      setMessages((m) => [...m, { id: mid(), role: 'user', text: t } as TextMessage]);
      scrollToEnd();
    },
    [scrollToEnd]
  );
  const addAi = useCallback(
    (t: string) => {
      setMessages((m) => [...m, { id: mid(), role: 'ai', text: t } as TextMessage]);
      scrollToEnd();
    },
    [scrollToEnd]
  );

  const runSearch = useCallback(
    async (p: UserPreferences) => {
      setIsTyping(true);
      setQuickReplies([]);
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const vendors = await fetchVendorsFromFirestore(p);
        setLastVendors(vendors);
        if (vendors.length === 0) {
          setIsTyping(false);
          setMessages((m) => [
            ...m,
            {
              id: mid(),
              role: 'ai',
              text: 'Koi vendor match nahi mila. Thoda budget / city / category change karke dobara try karein! 🙏',
            } as TextMessage,
          ]);
          setQuickReplies([...Q_AFTER, '🔄 New search']);
          setCurrentStep('freeChat');
          setAfterResults(true);
          scrollToEnd();
          return;
        }
        const data = await getAIRecommendations(p, vendors);
        setIsTyping(false);
        setMessages((m) => [
          ...m,
          { id: mid(), role: 'results', data } as ResultMessage,
        ]);
        setQuickReplies([...Q_AFTER]);
        setCurrentStep('results');
        setAfterResults(true);
        scrollToEnd();
      } catch (e) {
        setIsTyping(false);
        const msg = e instanceof Error ? e.message : 'Error';
        setMessages((m) => [
          ...m,
          {
            id: mid(),
            role: 'ai',
            text: `Sorry! ${msg}. Set EXPO_PUBLIC_GEMINI_KEY in .env for AI results.`,
          } as TextMessage,
        ]);
        setQuickReplies([...Q_AFTER]);
        setAfterResults(true);
        scrollToEnd();
      }
    },
    [scrollToEnd]
  );

  const goNext = useCallback(
    (label: string, p: UserPreferences) => {
      if (currentStep === 'category') {
        p.category = label;
        setPrefs(p);
        setCurrentStep('city');
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages((m) => [
            ...m,
            {
              id: mid(),
              role: 'ai',
              text: `Great choice! ${label} ke liye aap kaunse city mein dhundh rahe hain?`,
            } as TextMessage,
          ]);
          setQuickReplies(Q_CITY);
          scrollToEnd();
        }, 500);
        return;
      }
      if (currentStep === 'city') {
        p.city = label;
        setPrefs(p);
        setCurrentStep('budget');
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages((m) => [
            ...m,
            { id: mid(), role: 'ai', text: 'Perfect! Aapka approximate budget kya hai?' } as TextMessage,
          ]);
          setQuickReplies(Q_BUDGET);
          scrollToEnd();
        }, 500);
        return;
      }
      if (currentStep === 'budget') {
        p.budget = label;
        setPrefs(p);
        setCurrentStep('date');
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages((m) => [
            ...m,
            { id: mid(), role: 'ai', text: 'Event kab hai aapka? 📅' } as TextMessage,
          ]);
          setQuickReplies(Q_DATE);
          scrollToEnd();
        }, 500);
        return;
      }
      if (currentStep === 'date') {
        p.eventDate = label;
        setPrefs(p);
        setCurrentStep('extras');
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages((m) => [
            ...m,
            {
              id: mid(),
              role: 'ai',
              text: 'Koi special requirement hai? (optional - skip bhi kar sakte hain)',
            } as TextMessage,
          ]);
          setQuickReplies(Q_EXTRAS);
          scrollToEnd();
        }, 500);
        return;
      }
      if (currentStep === 'extras') {
        p.specialReq = label;
        setPrefs(p);
        setCurrentStep('results');
        void runSearch(p);
      }
    },
    [currentStep, runSearch, scrollToEnd]
  );

  const onChoice = (label: string) => {
    if (afterResults) {
      if (label.includes('Refine') || label.includes('New search')) {
        reset();
        setMessages([{ id: mid(), role: 'ai', text: OPENING }]);
        return;
      }
      if (label.includes('See all')) {
        onClose();
        if (navigationRef.isReady()) {
          (navigationRef as { navigate: (a: string) => void }).navigate('Vendors');
        }
        return;
      }
      if (label.includes('Contact')) {
        setMessages((m) => [
          ...m,
          {
            id: mid(),
            role: 'ai',
            text: 'Support: in-app help ya email. Hum jald milenge! 📧',
          } as TextMessage,
        ]);
        return;
      }
      if (label.includes('Ask')) {
        setQuickReplies([]);
        return;
      }
      addUser(label);
      (async () => {
        setIsTyping(true);
        setQuickReplies([]);
        const v = lastVendors.length
          ? lastVendors
          : await fetchVendorsFromFirestore(prefs);
        const r = await runFreeFormChat(label, prefs, v);
        setIsTyping(false);
        setMessages((m) => [...m, { id: mid(), role: 'ai', text: r.text } as TextMessage]);
        setQuickReplies(r.chips.length ? r.chips : [...Q_AFTER]);
        scrollToEnd();
      })();
      return;
    }
    addUser(label);
    goNext(label, { ...prefs });
  };

  const onSend = async () => {
    const t = input.trim();
    if (!t) {
      return;
    }
    setInput('');
    if (afterResults && (currentStep === 'results' || currentStep === 'freeChat')) {
      addUser(t);
      setIsTyping(true);
      setQuickReplies([]);
      try {
        const v = lastVendors.length
          ? lastVendors
          : await fetchVendorsFromFirestore(prefs);
        const r = await runFreeFormChat(t, prefs, v);
        setIsTyping(false);
        setMessages((m) => [...m, { id: mid(), role: 'ai', text: r.text } as TextMessage]);
        if (r.chips.length) {
          setQuickReplies(r.chips);
        } else {
          setQuickReplies([...Q_AFTER]);
        }
        scrollToEnd();
      } catch {
        setIsTyping(false);
        addAi('Error. Please try again.');
      }
      return;
    }
    onChoice(t);
  };

  const onBook = (id: string) => {
    onClose();
    if (navigationRef.isReady()) {
      (navigationRef as { navigate: (a: string, p?: { id: string }) => void }).navigate(
        'VendorDetail',
        { id }
      );
    }
  };

  const listData: (Message | { _t: 'typing' })[] = useMemo(
    () => (isTyping ? [...messages, { _t: 'typing' as const }] : messages),
    [messages, isTyping]
  );

  const renderItem = useCallback(
    ({ item }: { item: (typeof listData)[0] }) => {
      if ('_t' in item) {
        return <TypingIndicator />;
      }
      if (item.role === 'results') {
        return <ResultBlock data={item.data} onBook={onBook} />;
      }
      return <ChatMessageBubble role={item.role} text={item.text} />;
    },
    [onBook]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
        <LinearGradient
          colors={[ORANGE, ORANGE_2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>✨ AI Vendor Assistant</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <MaterialCommunityIcons name="close" size={26} color="#fff" />
          </Pressable>
        </LinearGradient>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={(it, i) =>
              '_t' in it && it._t === 'typing' ? 'typing' : (it as Message).id
            }
            renderItem={renderItem}
            onContentSizeChange={scrollToEnd}
            contentContainerStyle={styles.listPad}
            keyboardShouldPersistTaps="handled"
          />
          {quickReplies.length > 0 && !isTyping && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {quickReplies.map((q) => (
                <Chip
                  key={q}
                  style={styles.chip}
                  textStyle={styles.chipText}
                  mode="outlined"
                  onPress={() => onChoice(q)}
                >
                  {q}
                </Chip>
              ))}
            </ScrollView>
          )}
          <View
            style={[styles.inputRow, { paddingBottom: 8 + insets.bottom }]}
          >
            <TextInput
              style={styles.inp}
              placeholder="Type message..."
              placeholderTextColor="#999"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={onSend}
            />
            <Button mode="contained" buttonColor={ORANGE} onPress={onSend} compact>
              Send
            </Button>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ResultBlock({
  data,
  onBook,
}: {
  data: AIVendorResultPayload;
  onBook: (id: string) => void;
}) {
  return (
    <View style={rb.container}>
      <Text style={rb.intro}>{data.message}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={rb.hz}>
        {data.top3.map((v) => (
          <View key={v.vendorId} style={rb.card}>
            <Image
              source={{
                uri:
                  v.photoURL || 'https://via.placeholder.com/100?text=Vendor',
              }}
              style={rb.img}
            />
            <Text style={rb.name} numberOfLines={2}>
              {v.vendorName}
            </Text>
            <View style={rb.badge}>
              <Text style={rb.badgeT}>{v.category}</Text>
            </View>
            <Text style={rb.rating}>
              ⭐ {v.rating} · {v.priceRange}
            </Text>
            <Text style={rb.city}>📍 {v.city}</Text>
            <Text style={rb.why} numberOfLines={3}>
              {v.whyRecommend}
            </Text>
            <Button
              mode="contained"
              buttonColor={ORANGE}
              style={{ marginTop: 8 }}
              onPress={() => onBook(v.vendorId)}
            >
              Book now
            </Button>
          </View>
        ))}
      </ScrollView>
      {data.myPick ? (
        <View style={rb.picked}>
          <Text style={rb.pickTitle}>⭐ AI's Top Pick</Text>
          <View style={rb.pickBox}>
            <Text style={rb.pickName}>{data.myPick.vendorName}</Text>
            <Text style={rb.pickReason}>{data.myPick.reason}</Text>
            <View style={rb.tipBox}>
              <Text style={rb.tipTxt}>💡 {data.myPick.tip}</Text>
            </View>
            <Button
              mode="contained"
              buttonColor={ORANGE}
              onPress={() => onBook(data.myPick.vendorId)}
            >
              Book now →
            </Button>
          </View>
        </View>
      ) : null}
      <Text style={rb.follow}>💬 {data.followUpQuestion}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  listPad: { padding: 14, paddingBottom: 6 },
  chipsScroll: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    flexDirection: 'row',
  },
  chip: { marginRight: 6, marginBottom: 4, borderColor: ORANGE, backgroundColor: '#fff' },
  chipText: { color: TEXT, fontSize: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  inp: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: TEXT,
  },
});

const rb = StyleSheet.create({
  container: { marginBottom: 12, maxWidth: '100%' },
  intro: { color: ORANGE, fontSize: 15, marginBottom: 10, lineHeight: 22 },
  hz: { maxHeight: 360, marginBottom: 12 },
  card: {
    width: 200,
    marginRight: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0d8cc',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  img: { width: '100%', height: 80, borderRadius: 8, backgroundColor: '#f5f5f5' },
  name: { fontWeight: '800', color: TEXT, fontSize: 15, marginTop: 6 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: ORANGE_LIGHT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeT: { color: ORANGE, fontSize: 10, fontWeight: '800' },
  rating: { color: TEXT, fontSize: 12, marginTop: 4 },
  city: { color: '#666', fontSize: 12, marginTop: 2 },
  why: { fontStyle: 'italic', fontSize: 11, color: '#666', marginTop: 4 },
  picked: { marginTop: 8, marginBottom: 8 },
  pickTitle: { fontWeight: '900', color: ORANGE, marginBottom: 6, fontSize: 16 },
  pickBox: {
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fffef8',
  },
  pickName: { fontSize: 17, fontWeight: '800', color: TEXT },
  pickReason: { marginTop: 6, lineHeight: 20, color: TEXT },
  tipBox: {
    backgroundColor: '#FFF9E6',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  tipTxt: { color: '#5c4a00', fontSize: 13, lineHeight: 18 },
  follow: { color: '#666', fontSize: 13, fontStyle: 'italic', marginTop: 4 },
});
