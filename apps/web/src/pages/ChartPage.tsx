import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, EmptyState, ErrorState, LoadingState } from '../design/components';
import { useGetChartQuery } from '../store/api/chartApi';
import { useUiStore } from '../store/uiStore';
import { OrgTree } from './chart/OrgTree';

/** `?print=1` is the route the PDF endpoint (6.2) navigates to: it forces every roster to
 * render in full (no truncation affordance) so Puppeteer's print-media PDF omits no one; the
 * A3/chrome-hiding rules themselves come from the existing `@media print` stylesheet (8.7),
 * which Puppeteer's `page.pdf()` applies automatically. */
export function ChartPage() {
  const { data, error, isLoading, refetch } = useGetChartQuery();
  const [searchParams] = useSearchParams();
  const printMode = searchParams.get('print') === '1';
  const setPrintMode = useUiStore((state) => state.setPrintMode);

  useEffect(() => {
    setPrintMode(printMode);
    return () => setPrintMode(false);
  }, [printMode, setPrintMode]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="breadcrumb">Home · Organization chart</div>
          <h1>Organization chart</h1>
        </div>
      </div>

      <Card>
        <Card.Header title="Chart" />
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
            <EmptyState title="No departments yet" description="Import the masters to populate the chart." />
          </Card.Body>
        ) : (
          <OrgTree roots={data.roots} printMode={printMode} />
        )}
      </Card>
    </div>
  );
}
