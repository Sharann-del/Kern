import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen';
import { useAuth } from '@/providers/AuthProvider';

export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
