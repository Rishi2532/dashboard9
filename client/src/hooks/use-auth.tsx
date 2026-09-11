import { useState, useEffect, createContext, useContext } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface AssignedScheme {
  scheme_id: string;
  scheme_name: string;
  region?: string | null;
  district?: string | null;
  division?: string | null;
  engineer_role?: string;
  engineer_name?: string;
  engineer_email?: string;
  engineer_phone?: string;
}

interface EngineerProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  region?: string | null;
  district?: string | null;
  division?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEngineer: boolean;
  role: string;
  assignedSchemes: AssignedScheme[];
  assignedSchemeIds: string[];
  assignedSchemeNames: string[];
  engineerProfile: EngineerProfile | null;
  isLoading: boolean;
  error: string | null;
  user: any | null;
  login: (username: string, password: string, portal?: 'admin' | 'engineer' | 'user') => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAdmin: false,
  isEngineer: false,
  role: 'user',
  assignedSchemes: [],
  assignedSchemeIds: [],
  assignedSchemeNames: [],
  engineerProfile: null,
  isLoading: true,
  error: null,
  user: null,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEngineer, setIsEngineer] = useState(false);
  const [role, setRole] = useState('user');
  const [assignedSchemes, setAssignedSchemes] = useState<AssignedScheme[]>([]);
  const [assignedSchemeIds, setAssignedSchemeIds] = useState<string[]>([]);
  const [assignedSchemeNames, setAssignedSchemeNames] = useState<string[]>([]);
  const [engineerProfile, setEngineerProfile] = useState<EngineerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  // Check auth status on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await apiRequest('/api/auth/status');
        setIsAuthenticated(response.isLoggedIn || false);
        setIsAdmin(response.isAdmin || false);
        setIsEngineer(response.isEngineer || false);
        setRole(response.role || (response.isAdmin ? 'admin' : response.isEngineer ? 'engineer' : 'user'));
        setAssignedSchemes(response.assignedSchemes || []);
        setAssignedSchemeIds(response.assignedSchemeIds || []);
        setAssignedSchemeNames(response.assignedSchemeNames || []);
        setEngineerProfile(response.engineerProfile || null);
        setUser(response.user || null);
      } catch (err) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsEngineer(false);
        setRole('user');
        setAssignedSchemes([]);
        setAssignedSchemeIds([]);
        setAssignedSchemeNames([]);
        setEngineerProfile(null);
        setUser(null);
        setError('Error checking authentication status');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string, portal?: 'admin' | 'engineer' | 'user') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, portal }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      setIsAuthenticated(true);
      setIsAdmin(!!response.isAdmin);
      setIsEngineer(!!response.isEngineer);
      setRole(response.role || (response.isAdmin ? 'admin' : response.isEngineer ? 'engineer' : 'user'));
      setAssignedSchemes(response.assignedSchemes || []);
      setAssignedSchemeIds(response.assignedSchemeIds || []);
      setAssignedSchemeNames(response.assignedSchemeNames || []);
      setEngineerProfile(response.engineerProfile || null);
      setUser(response.user || response);
      
      queryClient.setQueryData(['/api/auth/status'], {
        isLoggedIn: true,
        isAdmin: !!response.isAdmin,
        isEngineer: !!response.isEngineer,
        role: response.role || (response.isAdmin ? 'admin' : response.isEngineer ? 'engineer' : 'user'),
        assignedSchemes: response.assignedSchemes || [],
        assignedSchemeIds: response.assignedSchemeIds || [],
        assignedSchemeNames: response.assignedSchemeNames || [],
        engineerProfile: response.engineerProfile || null,
        user: response.user || response,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      return response;
    } catch (err) {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsEngineer(false);
      setRole('user');
      setAssignedSchemes([]);
      setAssignedSchemeIds([]);
      setAssignedSchemeNames([]);
      setEngineerProfile(null);
      setUser(null);
      setError((err as Error).message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsEngineer(false);
      setRole('user');
      setAssignedSchemes([]);
      setAssignedSchemeIds([]);
      setAssignedSchemeNames([]);
      setEngineerProfile(null);
      setUser(null);

      // Flush all queries and cache
      queryClient.clear();
      setIsLoading(false);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        isEngineer,
        role,
        assignedSchemes,
        assignedSchemeIds,
        assignedSchemeNames,
        engineerProfile,
        isLoading,
        error,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);