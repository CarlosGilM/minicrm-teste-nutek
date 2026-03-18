import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useState } from 'react';

const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().min(1, 'O e-mail é obrigatório').email('Formato de e-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormInputs) => {
    try {
      setApiError('');
      await registerUser(data);
      navigate('/contacts', { replace: true });
    } catch (error) {
      setApiError('Erro ao criar conta. Tente novamente.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-blue-600">MiniCRM</h1>
        </div>

        <div className="space-y-8 rounded-xl bg-white p-8 shadow-lg">
          <h2 className="text-center text-3xl font-bold text-gray-900">Criar nova conta</h2>

          {apiError && (
            <div className="rounded bg-red-100 p-3 text-sm text-red-600">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input
                type="text"
                {...register('name')}
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-blue-500
                  ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                {...register('email')}
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-blue-500
                  ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                {...register('password')}
                className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-blue-500
                  ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
              />
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            Já tem uma conta?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
