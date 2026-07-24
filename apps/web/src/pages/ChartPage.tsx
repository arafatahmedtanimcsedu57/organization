import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Breadcrumb, Button, Card, EmptyState, ErrorState, LoadingState } from '../design/components';
import { PAGE__BIG, PAGE_HEAD, PAGE_TITLE, PH_ACTIONS } from '../design/formStyles';
import { useGetChartQuery, useGetChartWarningsQuery } from '../store/api/chartApi';
import type { ChartNode } from '../store/api/chartNode';
import { useUiStore } from '../store/uiStore';
import { DataIssuesStrip } from './chart/DataIssuesStrip';
import { Legend } from './chart/Legend';
import { OrgTree } from './chart/OrgTree';
import { ChartCanvas } from './chart/topdown/ChartCanvas';
import { CanvasEditor } from './chart/topdown/CanvasEditor';
import { TopdownPrint } from './chart/topdown/TopdownPrint';

/** Depth-first lookup so the selected node tracks refetched chart data, never a stale object. */
function findNode(roots: ChartNode[], id: string): ChartNode | null {
  for (const root of roots) {
    if (root.id === id) return root;
    const found = findNode(root.children, id);
    if (found) return found;
  }
  return null;
}

/** `?print=1` is the route the PDF endpoint navigates to: it always renders the **Top-down**
 * layout fit-to-width for A4 portrait with every roster expanded (no truncation), regardless
 * of which view the maintainer had open interactively. The A4/chrome-hiding rules come from
 * the `@media print` stylesheet, which Puppeteer's `page.pdf()` applies automatically. */
export function ChartPage() {
  const { data, error, isLoading, refetch } = useGetChartQuery();
  const { data: warningsData } = useGetChartWarningsQuery();
  const [searchParams] = useSearchParams();
  const printMode = searchParams.get('print') === '1';
  const setPrintMode = useUiStore((state) => state.setPrintMode);
  const viewMode = useUiStore((state) => state.viewMode);
  const setViewMode = useUiStore((state) => state.setViewMode);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setPrintMode(printMode);
    return () => setPrintMode(false);
  }, [printMode, setPrintMode]);

  const selectedNode = data && selectedId ? findNode(data.roots, selectedId) : null;

  return (
    <div className={PAGE__BIG}>
      <div className={PAGE_HEAD}>
        <div>
          <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Organization chart' }]} />
          <h1 className={PAGE_TITLE}>Organization chart</h1>
        </div>
        {!printMode ? (
          <div className={`${PH_ACTIONS} no-print`} role="group" aria-label="Chart view">
            <Button
              variant={viewMode === 'topdown' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('topdown')}
            >
              Top-down
            </Button>
            <Button
              variant={viewMode === 'horizontal' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('horizontal')}
            >
              Horizontal
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
        ) : printMode ? (
          <TopdownPrint roots={data.roots} />
        ) : viewMode === 'horizontal' ? (
          <OrgTree roots={data.roots} printMode={false} />
        ) : (
          <ChartCanvas
            roots={data.roots}
            selectedId={selectedId}
            onSelectNode={(node) => setSelectedId(node?.id ?? null)}
          />
        )}
      </Card>

      {!printMode && viewMode === 'topdown' && selectedNode ? (
        <CanvasEditor node={selectedNode} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  );
}
