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

/** `.itable` — Shopify-style index table with optional selection + row actions, ported from `ui_design/shopify/styles.css`. */
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
    <table className="itable">
      <thead>
        <tr>
          {selectable ? <th style={{ width: 34 }} /> : null}
          {columns.map((column) => (
            <th key={column.key} style={column.width ? { width: column.width } : undefined} className={column.align === 'right' ? 'num' : undefined}>
              {column.header}
            </th>
          ))}
          {rowActions ? <th style={{ width: 44 }} /> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const key = rowKey(row);
          const selected = selectedKeys?.has(key) ?? false;
          const highlighted = highlightedKeys?.has(key) ?? false;

          return (
            <tr key={key} style={highlighted ? { background: 'var(--brand-tint)' } : undefined}>
              {selectable ? (
                <td>
                  <button
                    type="button"
                    className="cbx"
                    role="checkbox"
                    aria-checked={selected}
                    onClick={() => onToggleRow?.(key)}
                    style={selected ? { background: 'var(--brand)', borderColor: 'var(--brand)' } : undefined}
                  />
                </td>
              ) : null}
              {columns.map((column) => (
                <td key={column.key} className={column.align === 'right' ? 'num' : undefined}>
                  {column.render(row)}
                </td>
              ))}
              {rowActions ? <td>{rowActions(row)}</td> : null}
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

/** `.table-foot` — row-count summary + pager, sits below an `IndexTable`. */
export function IndexTableFooter({ summary, children }: IndexTableFooterProps) {
  return (
    <div className="table-foot">
      <span style={{ fontSize: 12.5, color: 'var(--text-sub)' }}>{summary}</span>
      {children ? <div className="pager">{children}</div> : null}
    </div>
  );
}
