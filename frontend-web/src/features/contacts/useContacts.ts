import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

// Tipagem base do contato
export type Contact = {
    id: string;
    name: string;
    email: string;
    phone?: string;
};

// Omitimos o ID na hora de criar, pois o backend gera isso
export type CreateContactData = Omit<Contact, 'id'>;

export function useContacts() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Envolvemos em useCallback para evitar re-renderizações desnecessárias no useEffect
    const fetchContacts = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.get('/contacts');
            setContacts(response.data);
        } catch (err) {
            setError('Erro ao carregar os contatos.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createContact = async (data: CreateContactData) => {
        try {
            await api.post('/contacts', data);
            // Se der sucesso, não precisamos fazer nada, o componente redireciona
        } catch (err) {
            throw new Error('Erro ao criar contato');
        }
    };

    return { contacts, isLoading, error, fetchContacts, createContact };
}