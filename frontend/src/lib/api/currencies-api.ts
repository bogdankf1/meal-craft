/**
 * Public Currencies API - for fetching available currencies
 */
import { baseApi } from "./base-api";

export interface PublicCurrency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  symbol_position: string;
  exchange_rate: number;
}

export const currenciesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrencies: builder.query<PublicCurrency[], void>({
      query: () => "/currencies",
      providesTags: ["Currencies"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetCurrenciesQuery } = currenciesApi;
