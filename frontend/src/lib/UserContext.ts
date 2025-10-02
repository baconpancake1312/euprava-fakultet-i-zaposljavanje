import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { authService, User, AuthResponse } from './authService';

interface UserContextType {
  user: User | null;
  isAuthenticated: boolean;
  microservice: 'university' | 'employment' | 'auth' | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [microservice, setMicroservice] = useState<'university' | 'employment' | 'auth' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    const currentToken = authService.getCurrentToken();
    
    if (currentUser && currentToken) {
      setUser(currentUser);
      setIsAuthenticated(true);
      
      const userType = currentUser.user_type;
      if (userType === 'STUDENT' || userType === 'PROFESSOR') {
        setMicroservice('university');
      } else if (userType === 'EMPLOYER' || userType === 'CANDIDATE') {
        setMicroservice('employment');
      } else {
        setMicroservice('auth');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response: AuthResponse = await authService.login({ email, password });
      
      setUser(response.user);
      setIsAuthenticated(true);
      setMicroservice(response.microservice);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setLoading(true);
      const response: AuthResponse = await authService.register(userData);
      
      setUser(response.user);
      setIsAuthenticated(true);
      setMicroservice(response.microservice);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      setMicroservice(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    isAuthenticated,
    microservice,
    login,
    register,
    logout,
    loading,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
