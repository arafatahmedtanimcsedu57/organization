import { create } from 'zustand';

export type ChartViewMode = 'topdown' | 'horizontal';

/** Maps a legacy persisted view mode ('tree'/'network', pre-canvas) onto the current pair. */
export function normalizeViewMode(value: string | null | undefined): ChartViewMode {
  if (value === 'tree' || value === 'horizontal') return 'horizontal';
  return 'topdown'; // 'network', 'topdown', unset, or unknown all land on the default canvas
}

/** Ephemeral UI state that never touches the server: chart filters, node selection, and
 * print/view mode. Server data/caching lives in RTK Query (`chartApi`) instead — see `design.md` §6. */
interface UiState {
  viewMode: ChartViewMode;
  setViewMode: (viewMode: ChartViewMode) => void;

  printMode: boolean;
  setPrintMode: (printMode: boolean) => void;

  filterQuery: string;
  setFilterQuery: (filterQuery: string) => void;

  selectedNodeId: string | null;
  selectNode: (nodeId: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  viewMode: 'topdown',
  setViewMode: (viewMode) => set({ viewMode }),

  printMode: false,
  setPrintMode: (printMode) => set({ printMode }),

  filterQuery: '',
  setFilterQuery: (filterQuery) => set({ filterQuery }),

  selectedNodeId: null,
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
}));
