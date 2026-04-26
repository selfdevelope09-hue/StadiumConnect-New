import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

type Value = { open: () => void };

const AIAssistantContext = createContext<Value | null>(null);

export function AIAssistantProvider({
  children,
  onOpen,
}: {
  children: ReactNode;
  onOpen: () => void;
}) {
  const v = useMemo(() => ({ open: onOpen }), [onOpen]);
  return (
    <AIAssistantContext.Provider value={v}>
      {children}
    </AIAssistantContext.Provider>
  );
}

/** Call from Home (or any screen under UserAppNavigator) to open the same AI modal as the FAB. */
export function useOpenAIAssistant() {
  const ctx = useContext(AIAssistantContext);
  return ctx ?? { open: () => {} };
}
