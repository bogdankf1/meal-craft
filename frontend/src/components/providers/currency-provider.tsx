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
  formatPrice,
  getCurrencySymbol,
} from "@/lib/currency";
import { useGetCurrenciesQuery } from "@/lib/api/currencies-api";
import { useIsAuthenticated } from "@/lib/hooks/use-is-authenticated";

// Extended currency type that includes exchange rate
interface ExtendedCurrency extends Currency {
  exchange_rate: number;
}

interface CurrencyContextType {
  currency: CurrencyCode;
  currencyInfo: Currency;
  currencies: ExtendedCurrency[];
  isLoading: boolean;
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

// Fallback currencies when API is not available
const FALLBACK_CURRENCIES: ExtendedCurrency[] = CURRENCY_LIST.map(c => ({
  ...c,
  exchange_rate: c.code === "USD" ? 1 : c.code === "EUR" ? 0.92 : 41.5,
}));

// Default exchange rates (USD base)
const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  UAH: 41.5,
};

export function CurrencyProvider({ children, defaultCurrency = "UAH" }: CurrencyProviderProps) {
  // Use lazy initialization to read from localStorage only on client
  const [currency, setCurrencyState] = useState<CurrencyCode>(() =>
    getInitialCurrency(defaultCurrency)
  );

  // Check if user is authenticated (requires both session and auth token)
  const isAuthenticated = useIsAuthenticated();

  // Fetch currencies from API only when authenticated
  const { data: apiCurrencies, isLoading } = useGetCurrenciesQuery(undefined, {
    // Skip fetching on server or when not authenticated
    skip: typeof window === "undefined" || !isAuthenticated,
  });

  // Map API currencies to our format
  const currencies = useMemo<ExtendedCurrency[]>(() => {
    if (!apiCurrencies || apiCurrencies.length === 0) {
      return FALLBACK_CURRENCIES;
    }

    return apiCurrencies.map(c => ({
      code: c.code as CurrencyCode,
      name: c.name,
      symbol: c.symbol,
      position: c.symbol_position as "before" | "after",
      exchange_rate: c.exchange_rate,
    }));
  }, [apiCurrencies]);

  // Get exchange rates map
  const exchangeRates = useMemo(() => {
    const rates: Record<string, number> = {};
    for (const c of currencies) {
      rates[c.code] = c.exchange_rate;
    }
    return rates;
  }, [currencies]);

  // Validate that selected currency exists in available currencies
  // Use useMemo to derive a valid currency instead of useEffect
  const validCurrency = useMemo<CurrencyCode>(() => {
    if (currencies.length > 0 && !currencies.find(c => c.code === currency)) {
      // Currency not found, default to USD or first available
      const fallback = currencies.find(c => c.code === "USD") || currencies[0];
      if (fallback) {
        // Save the fallback to localStorage for next time
        saveCurrency(fallback.code as CurrencyCode);
        return fallback.code as CurrencyCode;
      }
    }
    return currency;
  }, [currencies, currency]);

  const setCurrency = useCallback((newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
    saveCurrency(newCurrency);
  }, []);

  // Get currency info from currencies list or fallback
  const currencyInfo = useMemo(() => {
    const found = currencies.find(c => c.code === validCurrency);
    if (found) {
      return {
        code: found.code,
        name: found.name,
        symbol: found.symbol,
        position: found.position,
      };
    }
    // Fallback to static CURRENCIES
    return CURRENCIES[validCurrency] || CURRENCIES.USD;
  }, [currencies, validCurrency]);

  // Convert amount from one currency to another using API rates
  const convertCurrency = useCallback((
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): number => {
    if (fromCurrency === toCurrency) return amount;

    const fromRate = exchangeRates[fromCurrency] || DEFAULT_EXCHANGE_RATES[fromCurrency] || 1;
    const toRate = exchangeRates[toCurrency] || DEFAULT_EXCHANGE_RATES[toCurrency] || 1;

    // Convert to USD first (base), then to target currency
    const amountInUSD = amount / fromRate;
    return amountInUSD * toRate;
  }, [exchangeRates]);

  // Format price with symbol position
  const formatPriceWithCurrency = useCallback((
    amount: number,
    currencyCode: string,
    options?: { decimals?: number; showCode?: boolean }
  ): string => {
    const { decimals = 2, showCode = false } = options || {};
    const curr = currencies.find(c => c.code === currencyCode) || currencyInfo;
    const formattedAmount = amount.toFixed(decimals);

    let result: string;
    if (curr.position === "before") {
      result = `${curr.symbol}${formattedAmount}`;
    } else {
      result = `${formattedAmount} ${curr.symbol}`;
    }

    if (showCode) {
      result += ` ${currencyCode}`;
    }

    return result;
  }, [currencies, currencyInfo]);

  const value = useMemo<CurrencyContextType>(() => ({
    currency: validCurrency,
    currencyInfo,
    currencies,
    isLoading,
    setCurrency,
    formatPrice: (amount: number, options) => formatPriceWithCurrency(amount, validCurrency, options),
    formatPriceFromUAH: (amountInUAH: number, options) => {
      const converted = convertCurrency(amountInUAH, "UAH", validCurrency);
      return formatPriceWithCurrency(converted, validCurrency, options);
    },
    formatPriceFromUSD: (amountInUSD: number, options) => {
      const converted = convertCurrency(amountInUSD, "USD", validCurrency);
      return formatPriceWithCurrency(converted, validCurrency, options);
    },
    convertFromUAH: (amountInUAH: number) => convertCurrency(amountInUAH, "UAH", validCurrency),
    symbol: currencyInfo.symbol,
  }), [validCurrency, currencyInfo, currencies, isLoading, setCurrency, formatPriceWithCurrency, convertCurrency]);

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
