import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { DataIssuesStrip } from './chart/DataIssuesStrip';
import { Legend } from './chart/Legend';
import { PdfExportMenu } from './chart/PdfExportMenu';
import { ChartCanvas } from './chart/topdown/ChartCanvas';
import { CanvasEditor } from './chart/topdown/CanvasEditor';
import { TopdownPrint } from './chart/topdown/TopdownPrint';
import { 
  Breadcrumb, 
  Card, 
  EmptyState, 
  ErrorState, 
  LoadingState 
} from '../design/components';

import { useUiStore } from '../store/uiStore';
import { useGetChartQuery, useGetChartWarningsQuery } from '../store/api/chartApi';
import type { ChartNode } from '../store/api/chartNode';

import { 
  PAGE__BIG, 
  PAGE_HEAD, 
  PAGE_TITLE, 
  PH_ACTIONS 
} from '../design/formStyles';


/** Depth-first lookup so the selected node tracks refetched chart data, never a stale object. */
function findNode(roots: ChartNode[], id: string): ChartNode | null {
  for (const root of roots) {
    if (root.id === id) return root;
    const found = findNode(root.children, id);
    if (found) return found;
  }
  return null;
}

export function ChartPage() {
  const { data, error, isLoading, refetch } = useGetChartQuery();
  const { data: warningsData } = useGetChartWarningsQuery();
  const [searchParams] = useSearchParams();
  const printMode = searchParams.get('print') === '1';
  const setPrintMode = useUiStore((state) => state.setPrintMode);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setPrintMode(printMode);
    return () => setPrintMode(false);
  }, [printMode, setPrintMode]);

  const selectedNode = data && selectedId ? findNode(data.roots, selectedId) : null;

  // Print mode may render a subset of divisions: `?divisions=id1,id2` (absent = all).
  const printRoots = (() => {
    if (!data) return [];
    const sel = searchParams.get('divisions');
    if (!sel) return data.roots;
    const ids = new Set(sel.split(',').filter(Boolean));
    const filtered = data.roots.filter((root) => ids.has(root.id));
    return filtered.length > 0 ? filtered : data.roots;
  })();

  // Print/PDF: a standalone document with none of the interactive page's chrome (breadcrumb,
  // title, the "Chart" card, the dot legend) - `TopdownPrint` renders its own complete cover,
  // masthead legend, and per-division pages. Keeping this chrome out is what `ChartPdfService`
  // (via Puppeteer) actually captures for the downloaded PDF.
  if (printMode) {
    if (!data) {
      return <p className="p-6 text-[13px] text-sub">{error ? 'Could not load the organization chart.' : 'Loading…'}</p>;
    }
    return <TopdownPrint roots={printRoots} />;
  }

  return (
    <div className={PAGE__BIG}>
      <div className={PAGE_HEAD}>
        <div>
          <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Organization chart' }]} />
          <h1 className={PAGE_TITLE}>Organization chart</h1>
        </div>
        {data && data.roots.length > 0 ? (
          <div className={`${PH_ACTIONS} no-print`} role="group" aria-label="Chart view">
            <PdfExportMenu roots={data.roots} />
          </div>
        ) : null}
      </div>

      <DataIssuesStrip warnings={warningsData?.warnings ?? []} />

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
        ) : (
          <ChartCanvas
            roots={data.roots}
            selectedId={selectedId}
            onSelectNode={(node) => setSelectedId(node?.id ?? null)}
          />
        )}
      </Card>

      {selectedNode ? <CanvasEditor node={selectedNode} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}
