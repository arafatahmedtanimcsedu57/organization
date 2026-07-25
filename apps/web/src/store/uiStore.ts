import { create } from 'zustand';

export type ChartViewMode = 'topdown' | 'horizontal';

interface UiState {

  printMode: boolean;
  setPrintMode: (printMode: boolean) => void;

  filterQuery: string;
  setFilterQuery: (filterQuery: string) => void;

  selectedNodeId: string | null;
  selectNode: (nodeId: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({

  printMode: false,
  setPrintMode: (printMode) => set({ printMode }),

  filterQuery: '',
  setFilterQuery: (filterQuery) => set({ filterQuery }),

  selectedNodeId: null,
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
}));
