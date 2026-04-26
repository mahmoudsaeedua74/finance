"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const KEY = "pf-selected-month";

type Ctx = {
  year: number;
  month: number; // 1-12
  setYearMonth: (y: number, m: number) => void;
  nextMonth: () => void;
  prevMonth: () => void;
};

const MonthContext = createContext<Ctx | null>(null);

function todayYm() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function MonthProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState(todayYm().year);
  const [month, setMonth] = useState(todayYm().month);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { y: number; m: number };
      if (p.y && p.m >= 1 && p.m <= 12) {
        setYear(p.y);
        setMonth(p.m);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setYearMonth = useCallback((y: number, m: number) => {
    if (m < 1) {
      setYear(y - 1);
      setMonth(12);
    } else if (m > 12) {
      setYear(y + 1);
      setMonth(1);
    } else {
      setYear(y);
      setMonth(m);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ y: year, m: month }));
    } catch {
      /* ignore */
    }
  }, [year, month]);

  const nextMonth = useCallback(() => {
    setYearMonth(year, month + 1);
  }, [year, month, setYearMonth]);

  const prevMonth = useCallback(() => {
    setYearMonth(year, month - 1);
  }, [year, month, setYearMonth]);

  const v = useMemo(
    () => ({ year, month, setYearMonth, nextMonth, prevMonth }),
    [year, month, setYearMonth, nextMonth, prevMonth]
  );

  return <MonthContext.Provider value={v}>{children}</MonthContext.Provider>;
}

export function useMonth() {
  const c = useContext(MonthContext);
  if (!c) throw new Error("useMonth must be used under MonthProvider");
  return c;
}
