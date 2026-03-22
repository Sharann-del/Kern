import { createBrowserRouter, Navigate } from 'react-router-dom';

import { GuestRoute } from '@/components/auth/GuestRoute';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { RootLayout } from '@/components/layout/RootLayout';
import { CollectionPage } from '@/pages/CollectionPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SignupPage } from '@/pages/SignupPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: 'login',
        element: (
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        ),
      },
      {
        path: 'signup',
        element: (
          <GuestRoute>
            <SignupPage />
          </GuestRoute>
        ),
      },
      { path: 'oauth/callback/:provider', element: <OAuthCallbackPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'c/:slug/views/custom/new', element: <CollectionPage /> },
              { path: 'c/:slug', element: <CollectionPage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
