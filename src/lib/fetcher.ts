function redirectToLogin() {
  if (typeof window === "undefined") return;
  const p = window.location.pathname;
  const to = p.startsWith("/ar") ? "/ar/login" : "/login";
  window.location.assign(to);
}

export async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });
  if (r.status === 401) {
    redirectToLogin();
    throw new Error("Unauthorized");
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = (body as { error?: string })?.error || r.statusText;
    throw new Error(err);
  }
  return body as T;
}
