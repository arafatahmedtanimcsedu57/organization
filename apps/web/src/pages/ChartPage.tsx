import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Breadcrumb, Button, Card, EmptyState, ErrorState, LoadingState } from '../design/components';
import { PAGE, PAGE_HEAD, PAGE_TITLE, PH_ACTIONS } from '../design/formStyles';
import { useGetChartQuery, useGetChartWarningsQuery } from '../store/api/chartApi';
import { useUiStore } from '../store/uiStore';
import { DataIssuesStrip } from './chart/DataIssuesStrip';
import { Legend } from './chart/Legend';
import { NetworkView } from './chart/NetworkView';
import { OrgTree } from './chart/OrgTree';

/** `?print=1` is the route the PDF endpoint (6.2) navigates to: it forces every roster to
 * render in full (no truncation affordance) so Puppeteer's print-media PDF omits no one; the
 * A3/chrome-hiding rules themselves come from the existing `@media print` stylesheet (8.7),
 * which Puppeteer's `page.pdf()` applies automatically. Print always renders the Tree (the
 * PDF layout this app ships), regardless of which view the maintainer had open interactively. */
export function ChartPage() {
  const { data, error, isLoading, refetch } = useGetChartQuery();
  const { data: warningsData } = useGetChartWarningsQuery();
  const [searchParams] = useSearchParams();
  const printMode = searchParams.get('print') === '1';
  const setPrintMode = useUiStore((state) => state.setPrintMode);
  const viewMode = useUiStore((state) => state.viewMode);
  const setViewMode = useUiStore((state) => state.setViewMode);

  useEffect(() => {
    setPrintMode(printMode);
    return () => setPrintMode(false);
  }, [printMode, setPrintMode]);

  return (
    <div className={PAGE}>
      <div className={PAGE_HEAD}>
        <div>
          <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Organization chart' }]} />
          <h1 className={PAGE_TITLE}>Organization chart</h1>
        </div>
        {!printMode ? (
          <div className={`${PH_ACTIONS} no-print`} role="group" aria-label="Chart view">
            <Button
              variant={viewMode === 'tree' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('tree')}
            >
              Tree
            </Button>
            <Button
              variant={viewMode === 'network' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('network')}
            >
              Network
            </Button>
            <a
              className="inline-flex items-center gap-1.5 h-[28px] px-[10px] rounded-md text-[12px] font-semibold border bg-brand text-white border-brand hover:bg-brand-dark transition-[background,box-shadow,transform] duration-[120ms] ease-brand"
              href="/api/chart/pdf"
              download="organization-chart.pdf"
            >
              Download PDF
            </a>
          </div>
        ) : null}
      </div>

      {!printMode ? <DataIssuesStrip warnings={warningsData?.warnings ?? []} /> : null}

      <Card>
        <Card.Header title="Chart" />
        {data && data.roots.length > 0 ? (
          <Card.Section>
            <Legend roots={data.roots} />
          </Card.Section>
        ) : null}
        {isLoading ? (
          <Card.Body>
            <LoadingState message="Loading the org chart…" />
          </Card.Body>
        ) : error ? (
          <Card.Body>
            <ErrorState description="Could not load the org chart." onRetry={refetch} />
          </Card.Body>
        ) : !data || data.roots.length === 0 ? (
          <Card.Body>
            <EmptyState
              title="No departments yet"
              description="Import the masters to populate the chart."
            />
          </Card.Body>
        ) : !printMode && viewMode === 'network' ? (
          <NetworkView roots={data.roots} />
        ) : (
          <OrgTree roots={data.roots} printMode={printMode} />
        )}
      </Card>
    </div>
  );
}
