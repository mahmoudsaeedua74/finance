"use client";

import { useQuery } from "@tanstack/react-query";
import { jsonFetch } from "@/lib/fetcher";

export type GoldPricesDto = {
  karat24: number;
  karat21: number;
  karat18: number;
  ounceUsd: number;
  usdToEgp: number;
  updatedAt: string;
};

export function useGoldPrices() {
  return useQuery({
    queryKey: ["gold-prices"],
    queryFn: () => jsonFetch<{ data: GoldPricesDto }>("/api/gold/prices"),
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
