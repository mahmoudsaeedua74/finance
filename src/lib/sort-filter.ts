export type NameAmountDateSortBy = "date" | "name" | "amount";

export function filterRowsByNameQuery<T extends { name: string }>(
  rows: T[],
  q: string
): T[] {
  const filter = q.trim().toLowerCase();
  if (!filter) return rows;
  return rows.filter((r) => r.name.toLowerCase().includes(filter));
}

export function sortRowsByNameAmountDate<T extends { name: string; amount: number; date: string }>(
  rows: T[],
  sortBy: NameAmountDateSortBy,
  sortDir: "asc" | "desc"
): T[] {
  const mult = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortBy === "name") {
      return mult * a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
    if (sortBy === "amount") {
      return mult * (a.amount - b.amount);
    }
    return mult * (new Date(a.date).getTime() - new Date(b.date).getTime());
  });
}
