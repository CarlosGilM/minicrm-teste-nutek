import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8787',
  // SEM withCredentials — o backend não usa cookies
});

let accessToken = '';

export function setAccessToken(token: string) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// Interceptor de requisição — injeta Bearer token
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de resposta — tenta refresh em 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const refreshResponse = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken }   // ← enviado no body, não via cookie
        );

        const newAccessToken: string = refreshResponse.data.accessToken;
        setAccessToken(newAccessToken);

        // Atualiza o refreshToken caso o backend rotacione ele
        if (refreshResponse.data.refreshToken) {
          localStorage.setItem('refreshToken', refreshResponse.data.refreshToken);
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken('');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
