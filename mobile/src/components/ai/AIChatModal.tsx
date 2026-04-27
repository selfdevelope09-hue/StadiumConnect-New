import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';

import { navigationRef } from '@/navigation/navigationRef';
import {
  type FireVendor,
  type UserPreferences,
  fetchVendorsFromFirestore,
  callGeminiAI,
  callGeminiFreeChat,
} from '@/services/aiChatService';

import { ChatMessage, type Message } from './ChatMessage';

type Step =
  | 'category'
  | 'city'
  | 'budget'
  | 'eventType'
  | 'extras'
  | 'results'
  | 'freeChat';

const STEP_CHIPS: Record<Step, string[]> = {
  category: [
    '🎨 Decorator',
    '📸 Photographer',
    '🍽️ Caterer',
    '🎵 Band Baja',
    '🏛️ Venue',
    '✨ Full Package',
  ],
  city: [
    '📍 Nagpur',
    '📍 Mumbai',
    '📍 Pune',
    '📍 Delhi',
    '📍 Pandharkawada',
    '📍 Warora',
    '📍 Other',
  ],
  budget: [
    '💰 Under ₹10,000',
    '💰 ₹10K - ₹50K',
    '💰 ₹50K - ₹1L',
    '💰 ₹1L - ₹5L',
    '💰 ₹5L+',
  ],
  eventType: [
    '💍 Wedding',
    '🎂 Birthday',
    '🏢 Corporate',
    '🎉 Anniversary',
    '🏆 Sports Event',
    '🎓 Graduation',
  ],
  extras: [
    '⭐ Top Rated Only',
    '💎 Premium Quality',
    '🏆 Most Reviews',
    '✅ Skip - Show Results',
  ],
  results: ['🔄 Naya Search', '📋 Sab Vendors Dikhao', '💬 Kuch Poochho'],
  freeChat: [],
};

const STEP_QUESTIONS: Record<Step, string> = {
  category:
    'Namaste! 🙏 Main hoon ConnectAI — StadiumConnect ka smart assistant.\n\nAapko kaunsi service chahiye?',
  city: 'Great choice! 🎯 Aap kaunse city mein service dhundh rahe hain?',
  budget: 'Perfect! Aapka approximate budget kya hai?',
  eventType: 'Kaun sa event plan kar rahe hain aap? 🎉',
  extras: 'Koi special preference hai? (optional)',
  results: '',
  freeChat: '',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onBookNow?: (vendorId: string) => void;
}

export const AIChatModal: React.FC<Props> = ({
  visible,
  onClose,
  onBookNow,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState<Step>('category');
  const [prefs, setPrefs] = useState<UserPreferences>({
    category: '',
    city: '',
    budget: '',
    eventType: '',
    specialReq: '',
  });
  const [vendors, setVendors] = useState<FireVendor[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMsg: Message = {
      ...msg,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setTimeout(
      () => flatListRef.current?.scrollToEnd({ animated: true }),
      100
    );
  }, []);

  const removeTyping = useCallback(() => {
    setMessages((prev) => prev.filter((m) => m.type !== 'typing'));
  }, []);

  useEffect(() => {
    if (visible) {
      setMessages([]);
      setCurrentStep('category');
      setPrefs({
        category: '',
        city: '',
        budget: '',
        eventType: '',
        specialReq: '',
      });
      setVendors([]);
      setInputText('');
      setTimeout(() => {
        addMessage({ type: 'ai_text', text: STEP_QUESTIONS.category });
        addMessage({ type: 'quick_replies', chips: STEP_CHIPS.category });
      }, 400);
    }
  }, [visible, addMessage]);

  const goVendors = useCallback(() => {
    onClose();
    if (navigationRef.isReady()) {
      navigationRef.navigate('Vendors' as never);
    }
  }, [onClose]);

  const handleChipPress = async (chip: string) => {
    addMessage({ type: 'user_text', text: chip });

    const cleanChip = chip.replace(/^[^\s]+ /, '');

    if (chip === '📋 Sab Vendors' || chip.includes('Sab Vendors')) {
      goVendors();
      return;
    }

    if (chip === '🔄 Naya Search') {
      setCurrentStep('category');
      setPrefs({
        category: '',
        city: '',
        budget: '',
        eventType: '',
        specialReq: '',
      });
      setTimeout(() => {
        addMessage({
          type: 'ai_text',
          text: 'Chalo fir se dhundhte hain! 🔍\n\nKaunsi service chahiye?',
        });
        addMessage({ type: 'quick_replies', chips: STEP_CHIPS.category });
      }, 400);
      return;
    }

    if (chip === '💬 Kuch Poochho' || chip === '💬 Aur Poochho') {
      setCurrentStep('freeChat');
      addMessage({ type: 'ai_text', text: 'Bilkul! Kya jaanna chahte hain aap? 😊' });
      return;
    }

    if (chip === '📋 All Cities Dikhao' || chip.includes('All Cities')) {
      goVendors();
      return;
    }

    if (currentStep === 'category') {
      const cat = cleanChip.toLowerCase().replace(/\s+/g, '_');
      const newPrefs = { ...prefs, category: cat };
      setPrefs(newPrefs);
      proceedToStep('city', newPrefs);
    } else if (currentStep === 'city') {
      const city = cleanChip.replace(/^📍\s*/, '').trim();
      const newPrefs = { ...prefs, city };
      setPrefs(newPrefs);
      proceedToStep('budget', newPrefs);
    } else if (currentStep === 'budget') {
      const newPrefs = { ...prefs, budget: chip };
      setPrefs(newPrefs);
      proceedToStep('eventType', newPrefs);
    } else if (currentStep === 'eventType') {
      const newPrefs = { ...prefs, eventType: cleanChip };
      setPrefs(newPrefs);
      proceedToStep('extras', newPrefs);
    } else if (currentStep === 'extras') {
      const newPrefs = {
        ...prefs,
        specialReq: chip === '✅ Skip - Show Results' ? '' : cleanChip,
      };
      setPrefs(newPrefs);
      await fetchAndShowResults(newPrefs);
    }
  };

  const proceedToStep = (step: Step, _currentPrefs: UserPreferences) => {
    setTimeout(() => {
      setCurrentStep(step);
      addMessage({ type: 'ai_text', text: STEP_QUESTIONS[step] });
      addMessage({ type: 'quick_replies', chips: STEP_CHIPS[step] });
    }, 400);
  };

  const fetchAndShowResults = async (finalPrefs: UserPreferences) => {
    setCurrentStep('results');
    setIsTyping(true);
    addMessage({ type: 'typing' });

    try {
      const fetchedVendors = await fetchVendorsFromFirestore(finalPrefs);
      setVendors(fetchedVendors);

      if (fetchedVendors.length === 0) {
        removeTyping();
        setIsTyping(false);
        addMessage({
          type: 'ai_text',
          text: `Oops! ${finalPrefs.city} mein ${finalPrefs.category} vendors nahi mile abhi. 😔\n\nKya doosra city try karein?`,
        });
        addMessage({
          type: 'quick_replies',
          chips: ['🔄 City Change Karo', '📋 All Cities Dikhao', '🔄 Naya Search'],
        });
        return;
      }

      const aiResult = await callGeminiAI(finalPrefs, fetchedVendors);
      removeTyping();
      setIsTyping(false);

      if (!aiResult) {
        addMessage({
          type: 'ai_text',
          text: 'ConnectAI response mein issue aaya. App mein API key (.env) check karo ya thodi der baad try karo.',
        });
        return;
      }

      addMessage({ type: 'ai_text', text: aiResult.message });
      addMessage({
        type: 'results',
        results: {
          top3: aiResult.top3,
          myPick: aiResult.myPick,
          followUpQuestion: aiResult.followUpQuestion,
        },
      });
    } catch {
      removeTyping();
      setIsTyping(false);
      addMessage({
        type: 'ai_text',
        text: 'Kuch technical issue aaya. Please dobara try karo.',
      });
    }
  };

  const handleSendText = async () => {
    if (!inputText.trim()) {
      return;
    }
    const text = inputText.trim();
    setInputText('');
    addMessage({ type: 'user_text', text });

    setIsTyping(true);
    addMessage({ type: 'typing' });

    const { reply, chips } = await callGeminiFreeChat(text, prefs, vendors as any);
    removeTyping();
    setIsTyping(false);

    addMessage({ type: 'ai_text', text: reply });
    if (chips.length > 0) {
      addMessage({ type: 'quick_replies', chips });
    }
  };

  const handleBook = (vendorId: string) => {
    onClose();
    onBookNow?.(vendorId);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>🤖</Text>
            <View style={styles.headerTitles}>
              <Text style={styles.headerTitle}>ConnectAI</Text>
              <Text style={styles.headerSub}>
                {isTyping ? 'Soch raha hoon...' : 'StadiumConnect · vendor help'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={90}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatMessage
                message={item}
                onChipPress={handleChipPress}
                onBookNow={handleBook}
              />
            )}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Kuch bhi poochho..."
              placeholderTextColor="#aaa"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendText}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !inputText.trim() && styles.sendBtnDisabled,
              ]}
              onPress={handleSendText}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendBtnText}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FF6B35',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitles: { marginLeft: 10 },
  headerEmoji: { fontSize: 28 },
  headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  messagesList: { paddingVertical: 12, paddingBottom: 20 },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  sendBtn: {
    backgroundColor: '#FF6B35',
    width: 42,
    height: 42,
    borderRadius: 21,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#ddd' },
  sendBtnText: { color: '#fff', fontSize: 16 },
});
