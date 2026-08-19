import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Currency } from '../types';
import { api } from '../lib/api';

interface CurrencyContextType {
  currencies: Currency[];
  selectedCurrency: Currency | null;
  setSelectedCurrency: (currency: Currency) => void;
  convertPrice: (priceUZS: number) => number;
  formatPrice: (priceUZS: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency | null>(null);

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      const data = await api.getCurrencies();
      setCurrencies(data);
      // Default to UZS (first currency or create a virtual UZS)
      const uzsCurrency: Currency = {
        id: 'currency-uzs',
        code: 'UZS',
        symbol: "so'm",
        rate: 1,
        isActive: true
      };
      setSelectedCurrencyState(uzsCurrency);
    } catch (err) {
      console.error('Failed to load currencies:', err);
    }
  };

  const setSelectedCurrency = (currency: Currency) => {
    setSelectedCurrencyState(currency);
  };

  const convertPrice = (priceUZS: number): number => {
    if (!selectedCurrency || selectedCurrency.code === 'UZS') {
      return priceUZS;
    }
    // Kurs hali yuklanmagan yoki noto'g'ri bo'lsa (0/undefined), NaN yoki
    // cheksizlikni ko'rsatib qo'ymaslik uchun so'mda qoldiramiz — bu
    // "hisob-kitobda xato" ko'rinishining oldini oladi.
    if (!selectedCurrency.rate || !isFinite(selectedCurrency.rate) || selectedCurrency.rate <= 0) {
      return priceUZS;
    }
    return priceUZS / selectedCurrency.rate;
  };

  const formatPrice = (priceUZS: number): string => {
    if (priceUZS === undefined || priceUZS === null || !isFinite(priceUZS)) {
      priceUZS = 0;
    }
    const converted = convertPrice(priceUZS);
    if (!selectedCurrency || selectedCurrency.code === 'UZS' || !selectedCurrency.rate) {
      return `${Math.round(priceUZS).toLocaleString('uz-UZ')} so'm`;
    }
    return `${selectedCurrency.symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currencies, selectedCurrency, setSelectedCurrency, convertPrice, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
