import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

type Value = {
  open: () => void;
  registerOpen: (fn: (() => void) | null) => void;
};

const AIAssistantContext = createContext<Value | null>(null);

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const r = useRef<(() => void) | null>(null);
  const open = useCallback(() => {
    r.current?.();
  }, []);
  const registerOpen = useCallback((fn: (() => void) | null) => {
    r.current = fn;
  }, []);
  const v = useMemo(
    () => ({ open, registerOpen }),
    [open, registerOpen]
  );
  return (
    <AIAssistantContext.Provider value={v}>
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useOpenAIAssistant() {
  const ctx = useContext(AIAssistantContext);
  return (
    ctx ?? {
      open: () => {},
      registerOpen: () => {},
    }
  );
}
