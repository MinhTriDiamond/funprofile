import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type TetBgOption = 0 | 1 | 2 | 3 | 4 | 5;

interface TetBackgroundContextType {
  selectedBg: TetBgOption;
  setSelectedBg: (bg: TetBgOption) => void;
}

const TetBackgroundContext = createContext<TetBackgroundContextType>({
  selectedBg: 0,
  setSelectedBg: () => {},
});

export const useTetBackground = () => useContext(TetBackgroundContext);

const STORAGE_KEY = 'tet-bg-choice';

export const TetBackgroundProvider = ({ children }: { children: ReactNode }) => {
  const [selectedBg, setSelectedBgState] = useState<TetBgOption>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? (Number(saved) as TetBgOption) : 0;
  });

  const setSelectedBg = useCallback((bg: TetBgOption) => {
    setSelectedBgState(bg);
    localStorage.setItem(STORAGE_KEY, String(bg));
  }, []);

  return (
    <TetBackgroundContext.Provider value={{ selectedBg, setSelectedBg }}>
      {children}
    </TetBackgroundContext.Provider>
  );
};
