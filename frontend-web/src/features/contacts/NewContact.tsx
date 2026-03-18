import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useContacts } from './useContacts';
import { useState } from 'react';

const contactSchema = z.object({
  name: z.string().min(2, 'O nome é obrigatório (mín. 2 caracteres)'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
});

type ContactFormInputs = z.infer<typeof contactSchema>;

export function NewContact() {
  const { createContact } = useContacts();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormInputs>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormInputs) => {
    try {
      setApiError('');
      await createContact(data);
      navigate('/contacts', { replace: true });
    } catch (error) {
      setApiError('Erro ao salvar o contato. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Novo Contato</h1>
          <Link to="/contacts" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            ← Voltar
          </Link>
        </div>

        {apiError && (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-600">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              placeholder="Ex: João Silva"
              {...register('name')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">E-mail</label>
            <input
              type="email"
              placeholder="Ex: joao@email.com (opcional)"
              {...register('email')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone (opcional)</label>
            <input
              type="text"
              placeholder="Ex: (11) 99999-9999"
              {...register('phone')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Contato'}
          </button>
        </form>
      </div>
    </div>
  );
}
