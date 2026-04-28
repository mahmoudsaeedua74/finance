type GoldPrices = {
  karat24: number;
  karat21: number;
  karat18: number;
  ounceUsd: number;
  usdToEgp: number;
  updatedAt: string;
};

const OUNCE_TO_GRAM = 31.1;
const CACHE_MS = 60 * 60 * 1000;

let memCache: { at: number; data: GoldPrices } | null = null;

async function fetchJson(url: string) {
  const r = await fetch(url, { next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`Failed request: ${url}`);
  return r.json();
}

async function fetchOunceUsd(): Promise<number> {
  try {
    const d = (await fetchJson(
      "https://api.gold-api.com/price/XAU"
    )) as { price?: number };
    const p = Number(d.price);
    if (Number.isFinite(p) && p > 0) return p;
  } catch {
    // try fallback below
  }
  try {
    const d = (await fetchJson("https://api.metals.live/v1/spot/gold")) as unknown;
    if (Array.isArray(d) && d.length > 0) {
      const first = d[0] as unknown;
      if (Array.isArray(first) && first.length > 1) {
        const v = Number(first[1]);
        if (Number.isFinite(v) && v > 0) return v;
      }
      if (typeof first === "number" && Number.isFinite(first)) return first;
    }
  } catch {
    // try fallback below
  }
  const cafe = (await fetchJson(
    "https://www.goldprice.cafe/api/history?symbol=XAU&windowHours=1"
  )) as {
    points?: { time?: number; price?: number }[];
  };
  const points = Array.isArray(cafe.points) ? cafe.points : [];
  const latest = points[points.length - 1];
  const latestPrice = Number(latest?.price);
  if (!Number.isFinite(latestPrice) || latestPrice <= 0) {
    throw new Error("Could not fetch gold ounce price");
  }
  return latestPrice;
}

async function fetchUsdToEgp(): Promise<number> {
  try {
    const d = (await fetchJson(
      "https://api.frankfurter.app/latest?from=USD&to=EGP"
    )) as { rates?: { EGP?: number } };
    const v = Number(d?.rates?.EGP);
    if (Number.isFinite(v) && v > 0) return v;
  } catch {
    // fallback below
  }
  const fallback = (await fetchJson(
    "https://open.er-api.com/v6/latest/USD"
  )) as { rates?: { EGP?: number } };
  const v = Number(fallback?.rates?.EGP);
  if (!Number.isFinite(v) || v <= 0) throw new Error("Could not fetch USD/EGP");
  return v;
}

export async function getGoldPricesCached(): Promise<GoldPrices> {
  const now = Date.now();
  if (memCache && now - memCache.at < CACHE_MS) return memCache.data;

  const [ounceUsd, usdToEgp] = await Promise.all([fetchOunceUsd(), fetchUsdToEgp()]);
  const pricePerGram24 = (ounceUsd / OUNCE_TO_GRAM) * usdToEgp;
  const data: GoldPrices = {
    karat24: Number(pricePerGram24.toFixed(2)),
    karat21: Number((pricePerGram24 * 0.875).toFixed(2)),
    karat18: Number((pricePerGram24 * 0.75).toFixed(2)),
    ounceUsd: Number(ounceUsd.toFixed(2)),
    usdToEgp: Number(usdToEgp.toFixed(4)),
    updatedAt: new Date().toISOString(),
  };
  memCache = { at: now, data };
  return data;
}
