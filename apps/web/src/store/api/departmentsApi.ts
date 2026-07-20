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

export interface CreateDepartmentInput {
  name: string;
  parentName?: string;
  head?: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  parentName?: string;
  head?: string;
}

/** RTK Query client for the `master-data-management` capability's department CRUD (`/api/departments*`). */
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
    createDepartment: builder.mutation<Department, CreateDepartmentInput>({
      query: (body) => ({ url: '/departments', method: 'POST', body }),
      invalidatesTags: [{ type: 'Department', id: 'LIST' }],
    }),
    updateDepartment: builder.mutation<Department, { id: string; body: UpdateDepartmentInput }>({
      query: ({ id, body }) => ({ url: `/departments/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Department', id },
        { type: 'Department', id: 'LIST' },
      ],
    }),
    deactivateDepartment: builder.mutation<Department, string>({
      query: (id) => ({ url: `/departments/${id}/deactivate`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Department', id },
        { type: 'Department', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeactivateDepartmentMutation,
} = departmentsApi;
