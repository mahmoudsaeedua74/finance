export async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = (body as { error?: string })?.error || r.statusText;
    throw new Error(err);
  }
  return body as T;
}
