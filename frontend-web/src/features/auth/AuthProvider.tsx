import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setAccessToken } from '../../lib/api';

// 1. Tipagens
type User = {
    id: string;
    name: string;
    email: string;
};

type AuthContextData = {
    user: User | null;
    isAuthenticated: boolean;
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => void;
};

// 2. Criação do Contexto
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// 3. Componente Provider
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    // Função de Login
    const login = async (credentials: any) => {
        // Faz a chamada para a sua API (ajuste a rota conforme seu backend)
        const response = await api.post('/auth/login', credentials);

        const { token, user: userData } = response.data;

        // Salva o JWT apenas na memória (atendendo ao requisito)
        setAccessToken(token);

        // Salva os dados do usuário no estado do React
        setUser(userData);
    };

    // Função de Registro
    const register = async (userData: any) => {
        // Faz a chamada para a rota de cadastro
        await api.post('/auth/register', userData);

        // Após o cadastro, você pode optar por já logar o usuário automaticamente 
        // ou apenas redirecioná-lo para a tela de login.
        // Aqui vamos fazer o login automático reaproveitando a função:
        await login({ email: userData.email, password: userData.password });
    };

    // Função de Logout
    const logout = () => {
        // Limpa a memória e o estado
        setAccessToken('');
        setUser(null);
        // Em um cenário real, você também chamaria uma rota de logout na API 
        // para limpar o cookie httpOnly do refresh token.
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            login,
            register,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

// 4. Hook Customizado
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
}