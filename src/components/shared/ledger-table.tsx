import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LedgerColumn = {
  id: string;
  header: string;
  /** Share of the table, e.g. "22%". */
  width: string;
  align?: "start" | "end";
  tone?: "muted" | "strong";
};

export type LedgerRow = {
  id: string;
  cells: Record<string, ReactNode>;
};

/**
 * Fixed-column ledger. Header and value share the same edge (start, or end for amounts)
 * so Arabic RTL rows stay under their labels.
 */
export function LedgerTable({
  columns,
  rows,
  caption,
}: {
  columns: LedgerColumn[];
  rows: LedgerRow[];
  caption?: string;
}) {
  const amountCol = columns.find((c) => c.align === "end");
  const textCols = columns.filter((c) => c.align !== "end");
  const [lead, ...rest] = textCols;

  return (
    <div className="overflow-hidden rounded-lg border border-border/80">
      <div className="sm:hidden">
        {caption ? <p className="sr-only">{caption}</p> : null}
        <ul className="divide-y divide-border/70">
          {rows.map((row) => (
            <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-3 py-3">
              {lead ? (
                <div className="min-w-0 text-sm text-muted-foreground">
                  <span className="sr-only">{lead.header}: </span>
                  {row.cells[lead.id]}
                </div>
              ) : (
                <span />
              )}
              {amountCol ? (
                <div className="text-end text-sm font-medium tabular-nums text-foreground">
                  <span className="sr-only">{amountCol.header}: </span>
                  {row.cells[amountCol.id]}
                </div>
              ) : null}
              {rest.map((col) => (
                <div
                  key={col.id}
                  className={cn(
                    "col-span-2 min-w-0 break-words text-sm text-foreground",
                    col.tone === "strong" && "font-medium"
                  )}
                >
                  <span className="sr-only">{col.header}: </span>
                  {row.cells[col.id]}
                </div>
              ))}
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden sm:block">
        <table className="w-full table-fixed border-collapse text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <colgroup>
            {columns.map((col) => (
              <col key={col.id} style={{ width: col.width }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-border/80 bg-muted/40">
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    "px-3 py-2.5 align-bottom text-xs font-medium leading-snug text-muted-foreground",
                    col.align === "end" ? "text-end" : "text-start"
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0 even:bg-muted/20">
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      "px-3 py-2.5 align-middle",
                      col.align === "end" ? "text-end whitespace-nowrap tabular-nums" : "text-start",
                      col.id === "date" && "whitespace-nowrap text-muted-foreground",
                      col.tone === "strong" && "font-medium text-foreground",
                      col.tone === "muted" && "text-muted-foreground",
                      col.align !== "end" && col.id !== "date" && "break-words"
                    )}
                  >
                    {row.cells[col.id]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
