/**
 * Currency utility for MealCraft
 * Handles currency conversion and formatting across the app
 */

export type CurrencyCode = "USD" | "EUR" | "UAH";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  position: "before" | "after";
}

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", position: "before" },
  EUR: { code: "EUR", symbol: "€", name: "Euro", position: "before" },
  UAH: { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia", position: "after" },
};

export const CURRENCY_LIST: Currency[] = Object.values(CURRENCIES);

// Exchange rates relative to USD (base currency)
// In a production app, these would come from an API
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  UAH: 41.5,
};

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): number {
  if (fromCurrency === toCurrency) return amount;

  // Convert to USD first, then to target currency
  const amountInUSD = amount / EXCHANGE_RATES[fromCurrency];
  const convertedAmount = amountInUSD * EXCHANGE_RATES[toCurrency];

  return convertedAmount;
}

/**
 * Format a price with the currency symbol
 */
export function formatPrice(
  amount: number,
  currency: CurrencyCode,
  options?: {
    decimals?: number;
    showCode?: boolean;
  }
): string {
  const { decimals = 2, showCode = false } = options || {};
  const currencyInfo = CURRENCIES[currency];
  const formattedAmount = amount.toFixed(decimals);

  let result: string;
  if (currencyInfo.position === "before") {
    result = `${currencyInfo.symbol}${formattedAmount}`;
  } else {
    result = `${formattedAmount} ${currencyInfo.symbol}`;
  }

  if (showCode) {
    result += ` ${currency}`;
  }

  return result;
}

/**
 * Format a price, converting from UAH to display currency
 * Use for grocery/shopping data which is stored in UAH
 */
export function formatPriceInCurrency(
  amountInUAH: number,
  displayCurrency: CurrencyCode,
  options?: {
    decimals?: number;
    showCode?: boolean;
  }
): string {
  const convertedAmount = convertCurrency(amountInUAH, "UAH", displayCurrency);
  return formatPrice(convertedAmount, displayCurrency, options);
}

/**
 * Format a price, converting from USD to display currency
 * Use for pricing/subscription data which is stored in USD
 */
export function formatPriceFromUSD(
  amountInUSD: number,
  displayCurrency: CurrencyCode,
  options?: {
    decimals?: number;
    showCode?: boolean;
  }
): string {
  const convertedAmount = convertCurrency(amountInUSD, "USD", displayCurrency);
  return formatPrice(convertedAmount, displayCurrency, options);
}

/**
 * Get the currency symbol
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  return CURRENCIES[currency].symbol;
}

/**
 * Local storage key for persisting currency preference
 */
export const CURRENCY_STORAGE_KEY = "mealcraft-currency";

/**
 * Get saved currency from localStorage
 */
export function getSavedCurrency(): CurrencyCode {
  if (typeof window === "undefined") return "UAH";
  const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
  if (saved && saved in CURRENCIES) {
    return saved as CurrencyCode;
  }
  return "UAH";
}

/**
 * Save currency to localStorage
 */
export function saveCurrency(currency: CurrencyCode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
}
