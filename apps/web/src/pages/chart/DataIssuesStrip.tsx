import type { BuildWarning } from '@org-chart/domain';
import { Banner } from '../../design/components';

const KIND_LABEL: Record<BuildWarning['kind'], string> = {
  'unmatched-department': 'Unmatched department',
  'unknown-title': 'Unknown title',
  'orphan-department': 'Orphan department',
  'unknown-assignment-user': 'Unknown assignment user',
  'unknown-assignment-department': 'Unknown assignment department',
  'unknown-head': 'Unknown head',
};

/** `.no-print` data-issues strip: surfaces the build's non-fatal `BuildWarning`s (unmatched
 * departments, unknown titles, orphaned assignments, ...) so the drift in the source masters is
 * diagnosed in the UI rather than hidden. Grouped by kind with counts so a long run of warnings
 * reads as a scannable summary instead of a wall of text. Maintenance-facing only - omitted from
 * the printed/PDF chart, which is meant for distribution, not data QA.
 *
 * Rendered with only phrasing elements (`span`/`strong`), because `Banner` places its children in
 * a `<p>` - a `<div>`/`<ul>` there is invalid HTML and trips React hydration. */
export function DataIssuesStrip({ warnings }: { warnings: BuildWarning[] }) {
  if (warnings.length === 0) return null;

  // Group each warning's message under its kind, preserving first-seen kind order.
  const byKind = new Map<BuildWarning['kind'], string[]>();
  for (const warning of warnings) {
    const messages = byKind.get(warning.kind) ?? [];
    messages.push(warning.message);
    byKind.set(warning.kind, messages);
  }

  return (
    <div className="no-print">
      <Banner
        tone="warn"
        title={`${warnings.length} data issue${warnings.length === 1 ? '' : 's'} found`}
      >
        <span className="flex flex-col gap-2">
          {[...byKind].map(([kind, messages]) => (
            <span key={kind} className="block">
              <strong>
                {KIND_LABEL[kind]}
                {messages.length > 1 ? ` (${messages.length})` : ''}
              </strong>
              {messages.length === 1 ? (
                <>: {messages[0]}</>
              ) : (
                <span className="mt-1 flex flex-col gap-0.5">
                  {messages.map((message, i) => (
                    <span key={i} className="block ps-4 -indent-2">
                      • {message}
                    </span>
                  ))}
                </span>
              )}
            </span>
          ))}
        </span>
      </Banner>
    </div>
  );
}
