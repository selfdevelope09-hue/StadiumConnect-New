import { useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AIVendorSheet, type AIVendorSheetRef } from './AIVendorSheet';
import { FloatingAIButton } from './FloatingAIButton';

type Props = { children: ReactNode };

/**
 * Renders the main navigator and overlays the AI FAB + bottom sheet.
 */
export function LoggedInAppWithAI({ children }: Props) {
  const sheetRef = useRef<AIVendorSheetRef>(null);
  return (
    <View style={styles.root}>
      {children}
      <FloatingAIButton onPress={() => sheetRef.current?.present()} />
      <AIVendorSheet ref={sheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
