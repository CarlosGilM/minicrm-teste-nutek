import { useState, useCallback } from 'react';
import { api } from '../../lib/api';
import type { ContactResponse } from '../../types/api';

export type Contact = ContactResponse;
export type CreateContactData = Pick<Contact, 'name' | 'email' | 'phone'>;

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get('/contacts');
      setContacts(response.data);
    } catch {
      setError('Erro ao carregar os contatos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createContact = async (data: CreateContactData) => {
    try {
      await api.post('/contacts', data);
    } catch {
      throw new Error('Erro ao criar contato');
    }
  };

  const deleteContact = async (id: string) => {
    // Atualização otimista: remove da lista imediatamente
    setDeletingId(id);
    const previous = contacts;
    setContacts((prev) => prev.filter((c) => c.id !== id));
    try {
      await api.delete(`/contacts/${id}`);
    } catch {
      // Reverte em caso de erro
      setContacts(previous);
      throw new Error('Erro ao excluir contato');
    } finally {
      setDeletingId(null);
    }
  };

  return { contacts, isLoading, deletingId, error, fetchContacts, createContact, deleteContact };
}
