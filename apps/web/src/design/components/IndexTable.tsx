import type { ReactNode } from 'react';

export interface IndexTableColumn<Row> {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  width?: string;
  align?: 'left' | 'right';
}

export interface IndexTableProps<Row> {
  columns: IndexTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Highlight a row (e.g. mid-edit), keyed the same as `rowKey`. */
  highlightedKeys?: ReadonlySet<string>;
  selectable?: boolean;
  selectedKeys?: ReadonlySet<string>;
  onToggleRow?: (key: string) => void;
  /** Trailing per-row actions cell (kebab menu, etc). */
  rowActions?: (row: Row) => ReactNode;
  emptyState?: ReactNode;
}

const TH_BASE =
  'text-[12px] text-nowrap font-semibold text-sub px-4 py-[9px] border-b border-line-2 bg-surface-sub';
const TD_BASE = 'px-4 py-[11px] border-b border-line-2 align-middle';

/** `.itable` - index table with optional selection + row actions. The `itable` class is kept as a
 * hook (E2E selectors + the print stylesheet); all visual styling is Tailwind utilities. */
export function IndexTable<Row>({
  columns,
  rows,
  rowKey,
  highlightedKeys,
  selectable = false,
  selectedKeys,
  onToggleRow,
  rowActions,
  emptyState,
}: IndexTableProps<Row>) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <table className="itable w-full border-collapse">
      <thead>
        <tr>
          {selectable ? <th style={{ width: 34 }} /> : null}
          {columns.map((column) => (
            <th
              key={column.key}
              style={column.width ? { width: column.width } : undefined}
              className={`${TH_BASE} ${column.align === 'right' ? 'text-right' : 'text-left'}`}
            >
              {column.header}
            </th>
          ))}
          {rowActions ? <th style={{ width: 44 }} className={`${TH_BASE}`} /> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const key = rowKey(row);
          const selected = selectedKeys?.has(key) ?? false;
          const highlighted = highlightedKeys?.has(key) ?? false;

          return (
            <tr
              key={key}
              className="group transition-[background] duration-100 ease-brand hover:bg-surface-hover [&:last-child>td]:border-b-0"
              style={highlighted ? { background: 'var(--color-brand-tint)' } : undefined}
            >
              {selectable ? (
                <td className={TD_BASE}>
                  <button
                    type="button"
                    className={`w-4 h-4 rounded-[4px] border-[1.5px] inline-block align-middle p-0 ${
                      selected ? 'bg-brand border-brand' : 'border-line-strong'
                    }`}
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={selected ? 'Deselect row' : 'Select row'}
                    onClick={() => onToggleRow?.(key)}
                  />
                </td>
              ) : null}
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`${TD_BASE} ${column.align === 'right' ? 'text-right' : ''}`}
                >
                  {column.render(row)}
                </td>
              ))}
              {rowActions ? <td className={TD_BASE}>{rowActions(row)}</td> : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export interface IndexTableFooterProps {
  summary: ReactNode;
  children?: ReactNode;
}

/** `.table-foot` - row-count summary + pager, sits below an `IndexTable`. Kept as a print hook. */
export function IndexTableFooter({ summary, children }: IndexTableFooterProps) {
  return (
    <div className="table-foot flex items-center justify-between px-4 py-[11px]">
      <span className="text-[12.5px] text-sub">{summary}</span>
      {children ? <div className="flex gap-1">{children}</div> : null}
    </div>
  );
}
