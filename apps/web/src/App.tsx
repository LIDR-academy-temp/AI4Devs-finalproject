import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { ImportWizardPage } from '@/pages/ImportWizardPage';
import { LoginPage } from '@/pages/LoginPage';
import { NewReconciliationPage } from '@/pages/NewReconciliationPage';
import { ReconciliationDetailPage } from '@/pages/ReconciliationDetailPage';
import { ReconciliationsPage } from '@/pages/ReconciliationsPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/status" element={<HomePage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/reconciliations" element={<ReconciliationsPage />} />
              <Route path="/reconciliations/new" element={<NewReconciliationPage />} />
              <Route path="/reconciliations/:id/import/:source" element={<ImportWizardPage />} />
              <Route path="/reconciliations/:id" element={<ReconciliationDetailPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/reconciliations" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
