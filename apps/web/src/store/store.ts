import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import { chartApi } from './api/chartApi';
import { employeesApi } from './api/employeesApi';
import { departmentsApi } from './api/departmentsApi';
import { assignmentsApi } from './api/assignmentsApi';
import { historyApi } from './api/historyApi';

/** Server state only: every `packages/domain`-shaped resource is fetched/cached/invalidated
 * through RTK Query API slices (see `design.md` §6). UI-only state lives in `uiStore` (Zustand). */
export const store = configureStore({
  reducer: {
    [chartApi.reducerPath]: chartApi.reducer,
    [employeesApi.reducerPath]: employeesApi.reducer,
    [departmentsApi.reducerPath]: departmentsApi.reducer,
    [assignmentsApi.reducerPath]: assignmentsApi.reducer,
    [historyApi.reducerPath]: historyApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      chartApi.middleware,
      employeesApi.middleware,
      departmentsApi.middleware,
      assignmentsApi.middleware,
      historyApi.middleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
