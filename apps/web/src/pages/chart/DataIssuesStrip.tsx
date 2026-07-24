import type { BuildWarning } from '@org-chart/domain';
import { Banner } from '../../design/components';

const KIND_LABEL: Record<BuildWarning['kind'], string> = {
  'unmatched-department': 'Unmatched department',
  'unknown-title': 'Unknown title',
  'orphan-department': 'Orphan department',
  'unknown-assignment-user': 'Unknown assignment user',
  'unknown-assignment-department': 'Unknown assignment department',
};

/** `.no-print` data-issues strip: surfaces the build's non-fatal `BuildWarning`s (unmatched
 * departments, unknown titles, orphaned assignments, ...) so the drift in the source masters is
 * diagnosed in the UI rather than hidden. Maintenance-facing only — omitted from the printed/PDF
 * chart, which is meant for distribution, not data QA. */
export function DataIssuesStrip({ warnings }: { warnings: BuildWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="no-print">
      <Banner
        tone="warn"
        title={`${warnings.length} data issue${warnings.length === 1 ? '' : 's'} found`}
      >
        {warnings.map((warning, i) => (
          <span className="inline-block text-[13px]" key={i}>
            <strong>{KIND_LABEL[warning.kind]}:</strong> {warning.message}
            {i < warnings.length - 1 ? <br /> : null}
          </span>
        ))}
      </Banner>
    </div>
  );
}
