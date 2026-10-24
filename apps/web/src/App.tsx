import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { ReconciliationsPage } from '@/pages/ReconciliationsPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/status" element={<HomePage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/reconciliations" element={<ReconciliationsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/reconciliations" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
