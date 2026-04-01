import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ModelProvider } from '@/contexts/model-context';
import { ProfileProvider } from '@/contexts/profile-context';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider, useAuthContext } from '@/contexts/auth-context';
import { AuthenticatedApp } from '@/components/authenticated-app';
import { LoginPage } from '@/components/login-page';
import { ProtectedRoute } from '@/components/protected-route';
import { Loader2 } from 'lucide-react';

// Inner wrapper that reads auth state and builds the Stream Chat user object
function AppRoutes() {
  const { user, session, loading, signOut } = useAuthContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Build a Stream Chat compatible user from Supabase user
  const streamUser = user
    ? {
        id: user.id.replace(/-/g, '').slice(0, 20), // Stream ID must be alphanumeric max 40 chars
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        image: user.user_metadata?.avatar_url ||
          `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.email}`,
      }
    : null;

  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={
        user ? <Navigate to="/chat" replace /> : <LoginPage />
      } />

      {/* Protected chat routes */}
      <Route path="/chat" element={
        <ProtectedRoute>
          {streamUser && (
            <AuthenticatedApp
              user={streamUser as any}
              onLogout={signOut}
              onDeleteAccount={signOut}
              supabaseToken={session?.access_token}
            />
          )}
        </ProtectedRoute>
      } />
      <Route path="/chat/:channelId" element={
        <ProtectedRoute>
          {streamUser && (
            <AuthenticatedApp
              user={streamUser as any}
              onLogout={signOut}
              onDeleteAccount={signOut}
              supabaseToken={session?.access_token}
            />
          )}
        </ProtectedRoute>
      } />

      {/* Root redirect */}
      <Route path="/" element={
        user ? <Navigate to="/chat" replace /> : <Navigate to="/login" replace />
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <ModelProvider>
          <ProfileProvider>
            <div className="h-screen bg-background">
              <AppRoutes />
              <Toaster />
            </div>
          </ProfileProvider>
        </ModelProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
