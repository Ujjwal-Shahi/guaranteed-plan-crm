import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DealsListPage from './pages/DealsListPage';
import NewDealPage from './pages/NewDealPage';
import DealDetailPage from './pages/DealDetailPage';
import DashboardPage from './pages/DashboardPage';
import ASMMappingPage from './pages/ASMMappingPage';
import UsersPage from './pages/UsersPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/deals" element={<RequireAuth><DealsListPage /></RequireAuth>} />
      <Route path="/deals/new" element={<RequireAuth><NewDealPage /></RequireAuth>} />
      <Route path="/deals/:id" element={<RequireAuth><DealDetailPage /></RequireAuth>} />
      <Route path="/my-visits" element={<RequireAuth><DealsListPage /></RequireAuth>} />
      <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/asm-mapping" element={<RequireAuth><ASMMappingPage /></RequireAuth>} />
      <Route path="/users" element={<RequireAuth><UsersPage /></RequireAuth>} />
      <Route path="/" element={<Navigate to={user ? '/deals' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/deals" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
