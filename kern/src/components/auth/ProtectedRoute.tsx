import { Navigate, Outlet } from 'react-router-dom';

import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { useAuth } from '@/providers/AuthProvider';

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
