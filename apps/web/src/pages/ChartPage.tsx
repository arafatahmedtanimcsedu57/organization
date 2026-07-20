import { Card, EmptyState, ErrorState, LoadingState } from '../design/components';
import { useGetChartQuery } from '../store/api/chartApi';
import { OrgTree } from './chart/OrgTree';

export function ChartPage() {
  const { data, error, isLoading, refetch } = useGetChartQuery();

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
          <OrgTree roots={data.roots} />
        )}
      </Card>
    </div>
  );
}
