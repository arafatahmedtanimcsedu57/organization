import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BuildWarning } from '@org-chart/domain';
import type { ChartNode } from './chartNode';

/** RTK Query client for the `org-chart` capability's API (`/api/chart*`, proxied to the NestJS api). */
export const chartApi = createApi({
  reducerPath: 'chartApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Chart'],
  endpoints: (builder) => ({
    getChart: builder.query<{ roots: ChartNode[] }, void>({
      query: () => '/chart',
      providesTags: ['Chart'],
    }),
    getChartWarnings: builder.query<{ warnings: BuildWarning[] }, void>({
      query: () => '/chart/warnings',
      providesTags: ['Chart'],
    }),
  }),
});

export const { useGetChartQuery, useGetChartWarningsQuery } = chartApi;
