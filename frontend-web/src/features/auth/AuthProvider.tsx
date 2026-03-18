import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setAccessToken } from '../../lib/api';
import type { AuthUser } from '../../types/api';

type LoginInput = { email: string; password: string };
type RegisterInput = { name: string; email: string; password: string };

type AuthContextData = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = async (credentials: LoginInput) => {
    const response = await api.post('/auth/login', credentials);
    const { accessToken, refreshToken, user: userData } = response.data;

    setAccessToken(accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
  };

  const register = async (userData: RegisterInput) => {
    await api.post('/auth/register', userData);
    await login({ email: userData.email, password: userData.password });
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('refreshToken');
    setAccessToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
}
