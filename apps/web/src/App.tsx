import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ChartPage } from './pages/ChartPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { EmployeesPage } from './pages/admin/EmployeesPage';
import { DepartmentsPage } from './pages/admin/DepartmentsPage';
import { AssignmentsPage } from './pages/admin/AssignmentsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chart" element={<ChartPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="employees" replace />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
        </Route>
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
