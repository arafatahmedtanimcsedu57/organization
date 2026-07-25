import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/** Matches the `Employee` TypeORM entity as serialized by `apps/api`'s `EmployeesController`. */
export interface Employee {
  sysId: string;
  userId: string;
  lastName: string;
  firstName: string;
  /** Display cache of the resolved title (see `titleId`). */
  title: string;
  titleId: string | null;
  departmentId: string;
  active: boolean;
}

export interface CreateEmployeeInput {
  lastName: string;
  firstName: string;
  titleId: string;
  departmentId: string;
}

export interface UpdateEmployeeInput {
  lastName?: string;
  firstName?: string;
  titleId?: string;
  departmentId?: string;
}

/** RTK Query client for the `master-data-management` capability's employee CRUD (`/api/employees*`). */
export const employeesApi = createApi({
  reducerPath: 'employeesApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Employee'],
  endpoints: (builder) => ({
    getEmployees: builder.query<Employee[], void>({
      query: () => '/employees',
      providesTags: (result) =>
        result
          ? [...result.map((employee) => ({ type: 'Employee' as const, id: employee.sysId })), { type: 'Employee', id: 'LIST' }]
          : [{ type: 'Employee', id: 'LIST' }],
    }),
    createEmployee: builder.mutation<Employee, CreateEmployeeInput>({
      query: (body) => ({ url: '/employees', method: 'POST', body }),
      invalidatesTags: [{ type: 'Employee', id: 'LIST' }],
    }),
    updateEmployee: builder.mutation<Employee, { sysId: string; body: UpdateEmployeeInput }>({
      query: ({ sysId, body }) => ({ url: `/employees/${sysId}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { sysId }) => [
        { type: 'Employee', id: sysId },
        { type: 'Employee', id: 'LIST' },
      ],
    }),
    deactivateEmployee: builder.mutation<Employee, string>({
      query: (sysId) => ({ url: `/employees/${sysId}/deactivate`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, sysId) => [
        { type: 'Employee', id: sysId },
        { type: 'Employee', id: 'LIST' },
      ],
    }),
  }),
});

export const { useGetEmployeesQuery, useCreateEmployeeMutation, useUpdateEmployeeMutation, useDeactivateEmployeeMutation } =
  employeesApi;
