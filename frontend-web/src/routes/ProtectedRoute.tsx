import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';

export function ProtectedRoute() {
    const { isAuthenticated } = useAuth();

    // Se não estiver autenticado, redireciona para o login e substitui o histórico
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Se estiver autenticado, renderiza a página solicitada
    return <Outlet />;
}