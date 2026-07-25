import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/** Matches the `Title` TypeORM entity as serialized by `apps/api`'s `TitlesController`. */
export interface Title {
  id: string;
  name: string;
  nameEn: string;
  rank: number;
  staffLevel: boolean;
  active: boolean;
}

export interface CreateTitleInput {
  name: string;
  nameEn?: string;
  rank: number;
  staffLevel?: boolean;
}

export interface UpdateTitleInput {
  name?: string;
  nameEn?: string;
  rank?: number;
  staffLevel?: boolean;
}

/**
 * RTK Query client for managed titles and the Department↔Title assignment
 * (`/api/titles*`, `/api/departments/:id/titles`). `DepartmentTitles` is tagged
 * per-department plus an `ALL` sentinel so a title edit/deactivate refreshes every
 * department's picker at once.
 */
export const titlesApi = createApi({
  reducerPath: 'titlesApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Title', 'DepartmentTitles'],
  endpoints: (builder) => ({
    getTitles: builder.query<Title[], void>({
      query: () => '/titles',
      providesTags: (result) =>
        result
          ? [...result.map((title) => ({ type: 'Title' as const, id: title.id })), { type: 'Title', id: 'LIST' }]
          : [{ type: 'Title', id: 'LIST' }],
    }),
    createTitle: builder.mutation<Title, CreateTitleInput>({
      query: (body) => ({ url: '/titles', method: 'POST', body }),
      invalidatesTags: [{ type: 'Title', id: 'LIST' }],
    }),
    updateTitle: builder.mutation<Title, { id: string; body: UpdateTitleInput }>({
      query: ({ id, body }) => ({ url: `/titles/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Title', id },
        { type: 'Title', id: 'LIST' },
        { type: 'DepartmentTitles', id: 'ALL' },
      ],
    }),
    deactivateTitle: builder.mutation<Title, string>({
      query: (id) => ({ url: `/titles/${id}/deactivate`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Title', id },
        { type: 'Title', id: 'LIST' },
        { type: 'DepartmentTitles', id: 'ALL' },
      ],
    }),
    getDepartmentTitles: builder.query<Title[], string>({
      query: (departmentId) => `/departments/${departmentId}/titles`,
      providesTags: (_result, _error, departmentId) => [
        { type: 'DepartmentTitles', id: departmentId },
        { type: 'DepartmentTitles', id: 'ALL' },
      ],
    }),
    assignDepartmentTitle: builder.mutation<void, { departmentId: string; titleId: string }>({
      query: ({ departmentId, titleId }) => ({
        url: `/departments/${departmentId}/titles`,
        method: 'POST',
        body: { titleId },
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [{ type: 'DepartmentTitles', id: departmentId }],
    }),
    unassignDepartmentTitle: builder.mutation<void, { departmentId: string; titleId: string }>({
      query: ({ departmentId, titleId }) => ({
        url: `/departments/${departmentId}/titles/${titleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [{ type: 'DepartmentTitles', id: departmentId }],
    }),
  }),
});

export const {
  useGetTitlesQuery,
  useCreateTitleMutation,
  useUpdateTitleMutation,
  useDeactivateTitleMutation,
  useGetDepartmentTitlesQuery,
  useAssignDepartmentTitleMutation,
  useUnassignDepartmentTitleMutation,
} = titlesApi;
