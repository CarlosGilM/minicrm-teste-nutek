import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useContacts } from './useContacts';
import { useAuth } from '../auth/AuthProvider';

export function ContactsList() {
    const { contacts, isLoading, error, fetchContacts } = useContacts();
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-4xl space-y-6">
                {/* Cabeçalho */}
                <div className="flex items-center justify-between rounded-lg bg-white p-6 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Meus Contatos</h1>
                        <p className="text-sm text-gray-500">Logado como: {user?.email}</p>
                    </div>
                    <div className="flex gap-4">
                        <Link
                            to="/contacts/new"
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            + Novo Contato
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Sair
                        </button>
                    </div>
                </div>

                {/* Mensagens de estado */}
                {isLoading && <p className="text-gray-500">Carregando contatos...</p>}
                {error && <p className="text-red-500">{error}</p>}

                {/* Tabela */}
                {!isLoading && !error && (
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black ring-opacity-5">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">E-mail</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Telefone</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {contacts.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                                            Nenhum contato encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    contacts.map((contact) => (
                                        <tr key={contact.id}>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                                {contact.name}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                {contact.email}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                                {contact.phone || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}