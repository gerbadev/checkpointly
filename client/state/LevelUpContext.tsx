import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { LevelUpAnimation, type LevelUpPayload } from '@/components/LevelUpAnimation';

type LevelUpContextType = {
  triggerLevelUp: (payload: LevelUpPayload) => void;
  checkForLevelUp: (
    previousLevel: number,
    newLevel: number,
    currentXp: number,
    nextLevelXp: number,
    totalXp: number
  ) => void;
};

const LevelUpContext = createContext<LevelUpContextType | undefined>(undefined);

export function LevelUpProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [payload, setPayload] = useState<LevelUpPayload | null>(null);
  const lastLevelRef = useRef<number | null>(null);

  const triggerLevelUp = useCallback((levelUpPayload: LevelUpPayload) => {
    setPayload(levelUpPayload);
    setVisible(true);
  }, []);

  const checkForLevelUp = useCallback(
    (
      previousLevel: number,
      newLevel: number,
      currentXp: number,
      nextLevelXp: number,
      totalXp: number
    ) => {
      // Only trigger if level actually increased and we have a previous level to compare
      if (previousLevel && newLevel > previousLevel && lastLevelRef.current !== newLevel) {
        lastLevelRef.current = newLevel;
        triggerLevelUp({
          newLevel,
          currentXp,
          nextLevelXp,
          totalXp,
        });
      }
    },
    [triggerLevelUp]
  );

  const handleDone = useCallback(() => {
    setVisible(false);
    setPayload(null);
  }, []);

  return (
    <LevelUpContext.Provider value={{ triggerLevelUp, checkForLevelUp }}>
      {children}
      <LevelUpAnimation visible={visible} payload={payload} onDone={handleDone} />
    </LevelUpContext.Provider>
  );
}

export function useLevelUp() {
  const ctx = useContext(LevelUpContext);
  if (!ctx) throw new Error('useLevelUp must be used within LevelUpProvider');
  return ctx;
}
