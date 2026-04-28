"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jsonFetch } from "@/lib/fetcher";

export type CategoryType = "income" | "expense";
export type CategoryDto = {
  id: string;
  name: string;
  type: CategoryType;
  isDefault: boolean;
};

export function useCategories(type: CategoryType) {
  return useQuery({
    queryKey: ["categories", type],
    queryFn: () =>
      jsonFetch<{ data: CategoryDto[] }>(`/api/categories?type=${type}`),
  });
}

export function useCreateCategory(type: CategoryType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      jsonFetch<{ data: CategoryDto }>("/api/categories", {
        method: "POST",
        body: JSON.stringify({ type, name }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories", type] });
    },
  });
}
