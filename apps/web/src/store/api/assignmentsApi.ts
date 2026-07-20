import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/** A person's home ('primary') posting, or a second ('concurrent' / 兼務) posting. */
export type AssignmentType = 'primary' | 'concurrent';

/** Matches the `Assignment` TypeORM entity as serialized by `apps/api`'s `AssignmentsController`. */
export interface Assignment {
  id: string;
  employeeSysId: string;
  departmentId: string;
  title: string;
  isPrimary: boolean;
  assignmentType: AssignmentType;
  validFrom: string | null;
  validTo: string | null;
}

export interface CreateAssignmentInput {
  employeeSysId: string;
  departmentId: string;
  title: string;
  assignmentType: AssignmentType;
  isPrimary?: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface UpdateAssignmentInput {
  title?: string;
  assignmentType?: AssignmentType;
  isPrimary?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}

/** RTK Query client for the `concurrent-duties` capability's assignment CRUD (`/api/assignments*`). */
export const assignmentsApi = createApi({
  reducerPath: 'assignmentsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Assignment'],
  endpoints: (builder) => ({
    getAssignments: builder.query<Assignment[], void>({
      query: () => '/assignments',
      providesTags: (result) =>
        result
          ? [...result.map((assignment) => ({ type: 'Assignment' as const, id: assignment.id })), { type: 'Assignment', id: 'LIST' }]
          : [{ type: 'Assignment', id: 'LIST' }],
    }),
    createAssignment: builder.mutation<Assignment, CreateAssignmentInput>({
      query: (body) => ({ url: '/assignments', method: 'POST', body }),
      invalidatesTags: [{ type: 'Assignment', id: 'LIST' }],
    }),
    updateAssignment: builder.mutation<Assignment, { id: string; body: UpdateAssignmentInput }>({
      query: ({ id, body }) => ({ url: `/assignments/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Assignment', id },
        { type: 'Assignment', id: 'LIST' },
      ],
    }),
    removeAssignment: builder.mutation<void, string>({
      query: (id) => ({ url: `/assignments/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Assignment', id },
        { type: 'Assignment', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetAssignmentsQuery,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
  useRemoveAssignmentMutation,
} = assignmentsApi;
