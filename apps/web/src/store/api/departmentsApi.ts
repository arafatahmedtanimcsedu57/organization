import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/** Matches the `Department` TypeORM entity as serialized by `apps/api`'s `DepartmentsController`. */
export interface Department {
  id: string;
  name: string;
  parentName: string;
  head: string;
  sysId: string;
  active: boolean;
}

/** RTK Query client for the `master-data-management` capability's department reads (`/api/departments*`). */
export const departmentsApi = createApi({
  reducerPath: 'departmentsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Department'],
  endpoints: (builder) => ({
    getDepartments: builder.query<Department[], void>({
      query: () => '/departments',
      providesTags: (result) =>
        result
          ? [...result.map((department) => ({ type: 'Department' as const, id: department.id })), { type: 'Department', id: 'LIST' }]
          : [{ type: 'Department', id: 'LIST' }],
    }),
  }),
});

export const { useGetDepartmentsQuery } = departmentsApi;
