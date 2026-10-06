import * as React from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  /** Stable key, also used for `td`/`th` keying */
  id: string;
  /** Column header label (string or node) */
  label: React.ReactNode;
  /** Optional explicit cell renderer; defaults to `row[id]` */
  render?: (row: T, rowIndex: number) => React.ReactNode;
  /** Optional class name applied to both `th` and matching `td` */
  className?: string;
  /** Optional fixed width (CSS) */
  width?: string;
  /** Optional minimum width (CSS) — falls back to `width` if not provided */
  minWidth?: string;
  /** Optional alignment */
  align?: "left" | "right" | "center";
}

interface Props<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Stable identifier per row for React keying */
  rowKey: (row: T, index: number) => string | number;
  /** Optional click handler on the row body */
  onRowClick?: (row: T) => void;
  /** Show divider between rows (default true) */
  bordered?: boolean;
  className?: string;
  /** Empty state node when `rows.length === 0` */
  empty?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  bordered = true,
  className,
  empty,
}: Props<T>) {
  if (rows.length === 0 && empty) {
    return <div className={cn("rounded-xl border border-border bg-surface", className)}>{empty}</div>;
  }

  return (
    <div className={cn("rounded-xl border border-border bg-surface overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-2 border-b border-border">
              {columns.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  className={cn(
                    "px-4 py-3 font-medium text-text-muted",
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                    c.className,
                  )}
                  style={
                    c.width || c.minWidth
                      ? { width: c.width, minWidth: c.minWidth ?? c.width }
                      : undefined
                  }
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  bordered && "border-t border-border",
                  onRowClick && "cursor-pointer hover:bg-surface-2 transition-colors",
                )}
              >
                {columns.map((c) => {
                  const value = c.render ? c.render(row, i) : ((row as Record<string, unknown>)[c.id] as React.ReactNode);
                  return (
                    <td
                      key={c.id}
                      className={cn(
                        "px-4 py-3",
                        c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                        c.className,
                      )}
                    >
                      {value as React.ReactNode}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
