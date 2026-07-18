export type FxRateDto = {
  from: "SAR";
  to: "EGP";
  rate: number;
  updatedAt: string;
  cached: boolean;
};

const CACHE_MS = 12 * 60 * 60 * 1000;

let memCache: { at: number; data: FxRateDto } | null = null;

async function fetchSarToEgp(): Promise<number> {
  const r = await fetch("https://open.er-api.com/v6/latest/SAR", {
    next: { revalidate: 43_200 },
  });
  if (!r.ok) throw new Error("Could not fetch SAR/EGP rate");
  const d = (await r.json()) as {
    result?: string;
    rates?: { EGP?: number };
  };
  if (d.result && d.result !== "success") {
    throw new Error("Could not fetch SAR/EGP rate");
  }
  const rate = Number(d?.rates?.EGP);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Invalid SAR/EGP rate");
  }
  return rate;
}

/** Cached SAR → EGP mid-market rate from open.er-api.com (12h). */
export async function getSarToEgpRateCached(): Promise<FxRateDto> {
  const now = Date.now();
  if (memCache && now - memCache.at < CACHE_MS) {
    return { ...memCache.data, cached: true };
  }

  try {
    const rate = await fetchSarToEgp();
    const data: FxRateDto = {
      from: "SAR",
      to: "EGP",
      rate: Math.round(rate * 1e6) / 1e6,
      updatedAt: new Date().toISOString(),
      cached: false,
    };
    memCache = { at: now, data };
    return data;
  } catch (e) {
    if (memCache) {
      return { ...memCache.data, cached: true };
    }
    throw e;
  }
}
