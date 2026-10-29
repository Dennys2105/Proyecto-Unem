import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';

const loginSchema = z.object({
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [blockTimeLeft, setBlockTimeLeft] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      sessionStorage.setItem('unem_token', data.access_token);
      navigate('/dashboard', { replace: true });
    },
    onError: (err: any) => {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : 'Error de autenticación';

      if (status === 403) {
        setError(message);
        const unblockTime = Date.now() + 15 * 60 * 1000;
        sessionStorage.setItem('unem_auth_block', JSON.stringify({
          isBlocked: true,
          unblockTime,
        }));
      } else if (status === 401) {
        setError('Credenciales inválidas');
      } else if (status === 422) {
        setError('Error de validación en los datos enviados');
      } else {
        setError('Error de conexión con el servidor');
      }
    },
  });

  useEffect(() => {
    const blockData = sessionStorage.getItem('unem_auth_block');
    if (blockData) {
      const { isBlocked, unblockTime } = JSON.parse(blockData);
      if (isBlocked && unblockTime) {
        const checkBlock = () => {
          const remaining = Math.ceil((unblockTime - Date.now()) / 1000);
          if (remaining <= 0) {
            sessionStorage.removeItem('unem_auth_block');
            setBlockTimeLeft(null);
            setError(null);
          } else {
            setBlockTimeLeft(remaining);
          }
        };
        checkBlock();
        const interval = setInterval(checkBlock, 1000);
        return () => clearInterval(interval);
      }
    }
  }, []);

  const onSubmit = (data: LoginFormData) => {
    setError(null);
    mutation.mutate(data);
  };

  if (blockTimeLeft !== null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Cuenta Bloqueada</h2>
          <p className="text-gray-700 mb-4">
            Demasiados intentos fallidos. Intente nuevamente en:
          </p>
          <div className="text-4xl font-mono font-bold text-gray-900">
            {Math.floor(blockTimeLeft / 60)}:{(blockTimeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Sistema de Horarios UNEM</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Usuario</label>
            <input
              type="text"
              {...register('username')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={mutation.isPending}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              {...register('password')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={mutation.isPending}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Autenticando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};