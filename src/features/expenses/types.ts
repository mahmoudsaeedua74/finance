export type ExpenseRow = {
  _id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  kind: string;
  recurring: boolean;
  isTemplate: boolean;
  validFrom?: string;
  validTo?: string | null;
  rowKind: "variable" | "fixed_once" | "recurring";
  displayDate?: string;
  projectName?: string;
};

/** POST body for variable/one-time fixed rows — `kind` is set in the mutation hook. */
export type CreateVariableExpenseInput = {
  title: string;
  amount: number;
  category: string;
  date: string;
  projectName?: string;
};

export type CreateRecurringTemplateInput = {
  title: string;
  amount: number;
  category: string;
  isTemplate: true;
  recurring: true;
  validFrom: string;
  validTo: string | null;
  projectName?: string;
};

export type UpdateExpenseInput =
  | {
      title: string;
      amount: number;
      category: string;
      validFrom: string;
      validTo: string | null;
      recurring: true;
      isTemplate: true;
      kind: "fixed";
      projectName?: string;
    }
  | {
      title: string;
      amount: number;
      category: string;
      date: string;
      kind: "variable" | "fixed";
      projectName?: string;
    };
