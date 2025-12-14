"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  type CurrencyCode,
  type Currency,
  CURRENCIES,
  CURRENCY_LIST,
  getSavedCurrency,
  saveCurrency,
  convertCurrency,
  formatPrice,
  formatPriceInCurrency,
  formatPriceFromUSD as formatPriceFromUSDUtil,
  getCurrencySymbol,
} from "@/lib/currency";

interface CurrencyContextType {
  currency: CurrencyCode;
  currencyInfo: Currency;
  currencies: Currency[];
  setCurrency: (currency: CurrencyCode) => void;
  formatPrice: (amount: number, options?: { decimals?: number; showCode?: boolean }) => string;
  formatPriceFromUAH: (amountInUAH: number, options?: { decimals?: number; showCode?: boolean }) => string;
  formatPriceFromUSD: (amountInUSD: number, options?: { decimals?: number; showCode?: boolean }) => string;
  convertFromUAH: (amountInUAH: number) => number;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
  defaultCurrency?: CurrencyCode;
}

// Helper to get initial currency (handles SSR)
function getInitialCurrency(defaultCurrency: CurrencyCode): CurrencyCode {
  if (typeof window === "undefined") {
    return defaultCurrency;
  }
  return getSavedCurrency();
}

export function CurrencyProvider({ children, defaultCurrency = "UAH" }: CurrencyProviderProps) {
  // Use lazy initialization to read from localStorage only on client
  const [currency, setCurrencyState] = useState<CurrencyCode>(() =>
    getInitialCurrency(defaultCurrency)
  );

  const setCurrency = useCallback((newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
    saveCurrency(newCurrency);
  }, []);

  const value = useMemo<CurrencyContextType>(() => ({
    currency,
    currencyInfo: CURRENCIES[currency],
    currencies: CURRENCY_LIST,
    setCurrency,
    formatPrice: (amount: number, options) => formatPrice(amount, currency, options),
    formatPriceFromUAH: (amountInUAH: number, options) => formatPriceInCurrency(amountInUAH, currency, options),
    formatPriceFromUSD: (amountInUSD: number, options) => formatPriceFromUSDUtil(amountInUSD, currency, options),
    convertFromUAH: (amountInUAH: number) => convertCurrency(amountInUAH, "UAH", currency),
    symbol: getCurrencySymbol(currency),
  }), [currency, setCurrency]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
