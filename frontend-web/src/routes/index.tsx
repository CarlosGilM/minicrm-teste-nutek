import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Login } from '../features/auth/Login';
import { Register } from '../features/auth/Register';
import { ContactsList } from '../features/contacts/ContactsList';
import { NewContact } from '../features/contacts/NewContact';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/contacts" replace />,
    },
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/register',
        element: <Register />,
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: '/contacts',
                element: <ContactsList />,
            },
            {
                path: '/contacts/new',
                element: <NewContact />,
            },
        ],
    },
]);