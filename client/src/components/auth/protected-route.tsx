import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/use-auth';

interface AuthStatusResponse {
  isLoggedIn: boolean;
  isAdmin: boolean;
  isAdmin2?: boolean;
  role?: string;
}

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireAdmin2?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requireAdmin2 = false,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const auth = useAuth();

  // Check authentication status with real-time freshness
  const { data, isLoading, isError, isFetching } = useQuery<AuthStatusResponse>({
    queryKey: ['/api/auth/status'],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const isAuth = auth.isAuthenticated || Boolean(data?.isLoggedIn);
  const isAdm = Boolean(auth.isAdmin || data?.isAdmin || auth.role === 'admin' || auth.user?.role === 'admin');
  const isAdm2 = Boolean(auth.isAdmin2 || (data as any)?.isAdmin2 || auth.role === 'admin2' || auth.user?.role === 'admin2');
  
  // Only show pending if auth is still initializing, or if not yet authorized while query is in flight
  const isPending = auth.isLoading || (!isAuth && (isLoading || isFetching)) || 
    (requireAdmin && !isAdm && (isLoading || isFetching)) ||
    (requireAdmin2 && (!isAdm2 && !isAdm) && (isLoading || isFetching));

  useEffect(() => {
    if (!isPending) {
      // Not logged in at all - redirect to login
      if (!isAuth) {
        setLocation(redirectTo);
        return;
      }
      
      // Admin2 cannot access Admin pages; redirect to Admin2 form
      if (requireAdmin && !isAdm) {
        if (isAdm2) {
          setLocation('/admin2/form');
          return;
        }
        setLocation(redirectTo);
        return;
      }

      // Route requires Admin2 (or Super Admin)
      if (requireAdmin2 && !isAdm2 && !isAdm) {
        setLocation('/admin');
        return;
      }
    }
  }, [isAuth, isAdm, isAdm2, isPending, setLocation, requireAdmin, requireAdmin2, redirectTo]);

  if (isPending) {
    // Show loading spinner while checking auth status
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="lg" />
          <p className="text-blue-700 font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }
  // Not authenticated or not permitted when required
  if (!isAuth || (requireAdmin && !isAdm) || (requireAdmin2 && (!isAdm2 && !isAdm))) {
    return null;
  }

  // If properly authenticated with correct permissions, render the children
  return <>{children}</>;
}