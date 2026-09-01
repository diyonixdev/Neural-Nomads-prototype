import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Language, ActiveOrder, FarmerMatch } from '../types';
import { mockDefaultActiveOrder, mockTomatoMatches } from '../data/mockData';
import type { ParsedVoiceIntent, FarmerMatchResult, BuyerMatchResult } from '../services/aiService';

interface DemoContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  activeOrder: ActiveOrder;
  updateActiveOrder: (updates: Partial<ActiveOrder>) => void;
  matches: FarmerMatch[];
  selectedMatch: FarmerMatch | null;
  setSelectedMatch: (match: FarmerMatch | null) => void;
  resetDemo: () => void;
  lastSpokenText: string;
  setLastSpokenText: (text: string) => void;
  parsedIntent: ParsedVoiceIntent | null;
  setParsedIntent: (intent: ParsedVoiceIntent | null) => void;
  farmerMatchResults: FarmerMatchResult[];
  setFarmerMatchResults: (matches: FarmerMatchResult[]) => void;
  buyerMatchResults: BuyerMatchResult[];
  setBuyerMatchResults: (matches: BuyerMatchResult[]) => void;
  assistantResponse: string | null;
  setAssistantResponse: (response: string | null) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('consumer');
  const [language, setLanguage] = useState<Language>('en');
  const [activeOrder, setActiveOrder] = useState<ActiveOrder>(mockDefaultActiveOrder);
  const [matches] = useState<FarmerMatch[]>(mockTomatoMatches);
  const [selectedMatch, setSelectedMatch] = useState<FarmerMatch | null>(mockTomatoMatches[0]);
  const [lastSpokenText, setLastSpokenText] = useState<string>('');
  const [parsedIntent, setParsedIntent] = useState<ParsedVoiceIntent | null>(null);
  const [farmerMatchResults, setFarmerMatchResults] = useState<FarmerMatchResult[]>([]);
  const [buyerMatchResults, setBuyerMatchResults] = useState<BuyerMatchResult[]>([]);
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);

  // Persist demo state or initialize
  useEffect(() => {
    const savedRole = localStorage.getItem('farmdirect_role') as UserRole;
    const savedLang = localStorage.getItem('farmdirect_lang') as Language;
    if (savedRole) setRole(savedRole);
    if (savedLang) setLanguage(savedLang);
  }, []);

  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('farmdirect_role', newRole);
  };

  const handleSetLanguage = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('farmdirect_lang', newLang);
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'hi' : 'en';
    handleSetLanguage(nextLang);
  };

  const updateActiveOrder = (updates: Partial<ActiveOrder>) => {
    setActiveOrder((prev) => ({ ...prev, ...updates }));
  };

  const resetDemo = () => {
    setActiveOrder(mockDefaultActiveOrder);
    setSelectedMatch(mockTomatoMatches[0]);
    setLastSpokenText('');
    setParsedIntent(null);
    setFarmerMatchResults([]);
    setBuyerMatchResults([]);
    setAssistantResponse(null);
    localStorage.removeItem('farmdirect_role');
    localStorage.removeItem('farmdirect_lang');
    setRole('consumer');
    setLanguage('en');
  };

  return (
    <DemoContext.Provider
      value={{
        role,
        setRole: handleSetRole,
        language,
        setLanguage: handleSetLanguage,
        toggleLanguage,
        activeOrder,
        updateActiveOrder,
        matches,
        selectedMatch,
        setSelectedMatch,
        resetDemo,
        lastSpokenText,
        setLastSpokenText,
        parsedIntent,
        setParsedIntent,
        farmerMatchResults,
        setFarmerMatchResults,
        buyerMatchResults,
        setBuyerMatchResults,
        assistantResponse,
        setAssistantResponse,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = (): DemoContextType => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};
