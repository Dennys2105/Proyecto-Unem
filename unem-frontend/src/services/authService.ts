import api from '../lib/axios';
import type { LoginResponse } from '../types/auth';

export const authService = {
  login: async (data: { username: string; password: string }): Promise<LoginResponse> => {
    // OAuth2PasswordRequestForm requiere form-urlencoded, NO JSON
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);
    
    const response = await api.post('/Auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  
  register: async (data: { username: string; password: string; id_rol: number }) => {
    const response = await api.post('/Auth/register', data);
    return response.data;
  },
};