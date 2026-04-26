import { startOfMonth } from "date-fns";

/** Fields needed for list + detail responses (excludes `__v` bloat on the wire). */
export const EXPENSE_API_LIST_PROJECTION =
  "title amount date category kind recurring isTemplate validFrom validTo projectName createdAt updatedAt" as const;

type Lean = {
  _id: unknown;
  title: string;
  amount: number;
  date: Date;
  category: string;
  kind: "variable" | "fixed";
  recurring: boolean;
  isTemplate: boolean;
  validFrom: Date;
  validTo: Date | null;
  projectName?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function serializeForApi(d: Lean) {
  return {
    _id: String(d._id),
    title: d.title,
    amount: d.amount,
    date: d.date,
    category: d.category,
    kind: d.kind,
    recurring: d.recurring,
    isTemplate: d.isTemplate,
    validFrom: d.validFrom,
    validTo: d.validTo,
    projectName: d.projectName?.trim() || "",
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export type ExpenseListRow = ReturnType<typeof serializeForApi> & {
  rowKind: "variable" | "fixed_once" | "recurring";
  displayDate?: string;
};

/**
 * Merges two lean query results the same way as a single `date: -1` list would, then maps to API rows.
 */
export function buildMonthViewExpenseRows(
  nonT: Lean[],
  templateDocs: Lean[],
  year: number,
  month: number
): ExpenseListRow[] {
  const combined = [...nonT, ...templateDocs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const entries: ExpenseListRow[] = [];
  for (const e of combined) {
    if (e.isTemplate && e.recurring) {
      const rowStart = startOfMonth(new Date(year, month - 1, 1));
      entries.push({
        ...serializeForApi(e),
        rowKind: "recurring",
        displayDate: rowStart.toISOString(),
      });
    } else if (!e.isTemplate) {
      entries.push({
        ...serializeForApi(e),
        rowKind: e.kind === "fixed" ? "fixed_once" : "variable",
      });
    }
  }
  return entries;
}

export function buildTemplatesListRows(
  templates: Lean[]
): ExpenseListRow[] {
  return templates.map((d) => ({
    ...serializeForApi(d),
    rowKind: d.isTemplate
      ? "recurring"
      : d.kind === "fixed"
        ? "fixed_once"
        : "variable",
  }));
}

/** Non-template line items in actual transaction date order (all-time list). */
export function buildNonTemplateEntryRows(docs: Lean[]): ExpenseListRow[] {
  return docs.map((d) => ({
    ...serializeForApi(d),
    rowKind: d.kind === "fixed" ? "fixed_once" : "variable",
  }));
}

export function expenseCreatedJson(doc: {
  _id: unknown;
  title: string;
  amount: number;
  date: Date;
  category: string;
  kind: string;
  recurring: boolean;
  isTemplate: boolean;
  validFrom: Date;
  validTo: Date | null;
  projectName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    _id: String(doc._id),
    title: doc.title,
    amount: doc.amount,
    date: doc.date,
    category: doc.category,
    kind: doc.kind,
    recurring: doc.recurring,
    isTemplate: doc.isTemplate,
    validFrom: doc.validFrom,
    validTo: doc.validTo,
    projectName: doc.projectName?.trim() ?? "",
    ...(doc.createdAt ? { createdAt: doc.createdAt } : {}),
    ...(doc.updatedAt ? { updatedAt: doc.updatedAt } : {}),
  };
}
