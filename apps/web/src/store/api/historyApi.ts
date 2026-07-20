import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export type ChangeLogEntityType = 'employee' | 'department' | 'assignment';
export type ChangeLogAction = 'create' | 'update' | 'deactivate';

/** Matches the `ChangeLog` TypeORM entity as serialized by `apps/api`'s `HistoryController`. */
export interface ChangeLogEntry {
  id: string;
  entity: ChangeLogEntityType;
  entityId: string;
  action: ChangeLogAction;
  actor: string;
  changedAt: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface HistoryFilter {
  entity?: ChangeLogEntityType;
  entityId?: string;
  from?: string;
  to?: string;
}

/** RTK Query client for the read-only `change-history` capability (`GET /api/history`). */
export const historyApi = createApi({
  reducerPath: 'historyApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['History'],
  endpoints: (builder) => ({
    getHistory: builder.query<ChangeLogEntry[], HistoryFilter | void>({
      query: (filter) => ({ url: '/history', params: filter ?? {} }),
      providesTags: [{ type: 'History', id: 'LIST' }],
    }),
  }),
});

export const { useGetHistoryQuery } = historyApi;
