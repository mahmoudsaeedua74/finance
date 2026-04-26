export type RecurringCreateInput = {
  variant: "recurring";
  title: string;
  amount: number;
  category: string;
  projectName: string;
  validFrom: Date;
  validTo: Date | null;
  /** 1–30. If omitted, derived from `validFrom` in the API. */
  dueDayOfMonth: number;
};

export type OneOffCreateInput = {
  variant: "oneoff";
  title: string;
  amount: number;
  category: string;
  kind: "variable" | "fixed";
  projectName: string;
  date: Date;
};

export type ParsedExpenseCreate = RecurringCreateInput | OneOffCreateInput;

export function parseExpensePostBody(body: unknown):
  | { ok: true; data: ParsedExpenseCreate }
  | { ok: false; error: string; status: number } {
  if (body == null || typeof body !== "object") {
    return { ok: false, error: "Invalid body", status: 400 };
  }
  const b = body as Record<string, unknown>;
  const title = b.title;
  const amountRaw = b.amount;
  if (title == null || String(title).trim() === "" || amountRaw == null) {
    return { ok: false, error: "title and amount are required", status: 400 };
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount)) {
    return { ok: false, error: "Invalid amount", status: 400 };
  }
  const projectNameRaw = b.projectName;
  const projectName =
    typeof projectNameRaw === "string" ? projectNameRaw.trim().slice(0, 200) : "";
  const cat = String(b.category ?? "general");
  const kind = b.kind === "fixed" ? "fixed" : "variable";
  const isTpl = Boolean(b.isTemplate) && Boolean(b.recurring);

  if (isTpl) {
    if (!b.validFrom) {
      return {
        ok: false,
        error: "validFrom is required for recurring fixed expenses",
        status: 400,
      };
    }
    const vf = new Date(String(b.validFrom));
    if (Number.isNaN(vf.getTime())) {
      return { ok: false, error: "Invalid validFrom", status: 400 };
    }
    const vt = b.validTo ? new Date(String(b.validTo)) : null;
    if (b.validTo && vt && Number.isNaN(vt.getTime())) {
      return { ok: false, error: "Invalid validTo", status: 400 };
    }
    let due = 0;
    if (b.dueDayOfMonth != null && b.dueDayOfMonth !== "") {
      const d = Math.round(Number(b.dueDayOfMonth));
      if (!Number.isFinite(d) || d < 1 || d > 30) {
        return { ok: false, error: "dueDayOfMonth must be between 1 and 30", status: 400 };
      }
      due = d;
    }
    return {
      ok: true,
      data: {
        variant: "recurring",
        title: String(title),
        amount,
        category: cat,
        projectName,
        validFrom: vf,
        validTo: vt,
        dueDayOfMonth: due,
      },
    };
  }

  if (!b.date) {
    return { ok: false, error: "date is required", status: 400 };
  }
  const dt = new Date(String(b.date));
  if (Number.isNaN(dt.getTime())) {
    return { ok: false, error: "Invalid date", status: 400 };
  }
  return {
    ok: true,
    data: {
      variant: "oneoff",
      title: String(title),
      amount,
      category: cat,
      kind: kind as "variable" | "fixed",
      projectName,
      date: dt,
    },
  };
}
