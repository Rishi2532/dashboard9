import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';

interface AuthStatusResponse {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  // Check authentication status
  const { data, isLoading, isError } = useQuery<AuthStatusResponse>({
    queryKey: ['/api/auth/status'],
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (!isLoading) {
      setIsChecking(false);
      
      // Not logged in at all - redirect to login
      if (!data?.isLoggedIn) {
        setLocation(redirectTo);
        return;
      }
      
      // Logged in but not admin when admin is required - redirect
      if (requireAdmin && !data.isAdmin) {
        setLocation(redirectTo);
        return;
      }
    }
  }, [data, isLoading, setLocation, requireAdmin, redirectTo]);

  if (isChecking || isLoading) {
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

  // Not authenticated or not admin when required
  if (isError || !data?.isLoggedIn || (requireAdmin && !data.isAdmin)) {
    // Return null (useEffect will handle redirect)
    return null;
  }

  // If properly authenticated with correct permissions, render the children
  return <>{children}</>;
}