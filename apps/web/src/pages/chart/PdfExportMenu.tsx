import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowBigDownDash } from 'lucide-react';

import { Button } from '../../design/components';
import type { ChartNode } from '../../store/api/chartNode';


/** Build the `GET /api/chart/pdf` href for a selection; omit the param when everything is
 * selected so the server renders the whole chart. */
export function pdfHref(selectedIds: string[], total: number): string {
  if (selectedIds.length === 0 || selectedIds.length === total) return '/api/chart/pdf';
  const divisions = selectedIds.map(encodeURIComponent).join(',');
  return `/api/chart/pdf?divisions=${divisions}`;
}

/**
 * `.no-print` Download-PDF control: a popover that lets the maintainer export **all** divisions,
 * a **single** division, or any **subset** to PDF. The chosen division ids are passed to
 * `GET /api/chart/pdf?divisions=…`, which renders one division per landscape page. Kept out of
 * the printed output (it lives in the `.ph-actions` header group, hidden by the print stylesheet).
 */
export function PdfExportMenu({ roots }: { roots: ChartNode[] }) {
  const allIds = useMemo(() => roots.map((r) => r.id), [roots]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allIds));
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Derived during render (no sync effect): stale ids from a since-removed division simply
  // drop out, and `allSelected` stays correct without tracking `allIds` in state.
  const orderedSelection = allIds.filter((id) => selected.has(id));
  const allSelected = orderedSelection.length === allIds.length;
  const href = pdfHref(orderedSelection, allIds.length);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds));

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        variant="brand"
        size="sm"
        icon={ <ArrowBigDownDash/>}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Download PDF
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label="Download PDF options"
          className="absolute right-0 top-[calc(100%+6px)] z-20 w-[260px] rounded-lg border border-line bg-surface p-3 text-left shadow-pop"
        >
          <p className="mb-2 text-[12px] font-semibold text-strong">Divisions to include</p>

          <label className="flex cursor-pointer items-center gap-2 border-b border-line-2 pb-2 text-[13px] text-strong">
            <input
              type="checkbox"
              className="accent-brand"
              checked={allSelected}
              onChange={toggleAll}
            />
            <span className="font-medium">Select all</span>
          </label>

          <div className="max-h-[240px] overflow-auto py-1">
            {roots.map((root) => (
              <label
                key={root.id}
                className="flex cursor-pointer items-center gap-2 py-1 text-[13px] text-ink"
              >
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={selected.has(root.id)}
                  onChange={() => toggle(root.id)}
                />
                <span className="truncate">{root.name}</span>
              </label>
            ))}
          </div>

          <a
            className={`mt-2 inline-flex h-[30px] w-full items-center justify-center gap-1.5 rounded-md border text-[13px] font-semibold transition-[background,box-shadow] duration-[120ms] ease-brand ${
              orderedSelection.length === 0
                ? 'pointer-events-none border-line bg-surface-sub text-muted'
                : 'border-brand bg-brand text-white hover:bg-brand-dark'
            }`}
            href={href}
            download="organization-chart.pdf"
            aria-disabled={orderedSelection.length === 0}
            onClick={() => {
              if (orderedSelection.length === 0) return;
              setOpen(false);
            }}
          >
             <ArrowBigDownDash size={16}/>
            Download {allSelected ? 'all' : `(${orderedSelection.length})`}
          </a>
        </div>
      ) : null}
    </div>
  );
}
