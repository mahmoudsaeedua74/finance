import { useState, useEffect } from "react";

/**
 * The current local calendar year/month (not tied to the report month switcher).
 * Re-renders on a short interval so the month can update in long sessions.
 */
export function useTodayYearMonth() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  void tick;
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
