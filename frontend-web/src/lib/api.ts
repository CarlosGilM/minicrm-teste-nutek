import axios from 'axios';

// Instância base do Axios
export const api = axios.create({
    // Vamos usar uma variável de ambiente depois, mas deixamos um fallback local
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8787',
    // Crucial: permite que o navegador envie e receba cookies httpOnly (seu refresh token)
    withCredentials: true,
});

// === GERENCIAMENTO DO TOKEN EM MEMÓRIA ===
// Fica fora do ciclo de vida do React, o que é perfeito para o Axios acessar
let accessToken = '';

export function setAccessToken(token: string) {
    accessToken = token;
}

export function getAccessToken() {
    return accessToken;
}

// === INTERCEPTOR DE REQUISIÇÃO ===
// Injeta o JWT em todas as requisições que saem do frontend
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

// === INTERCEPTOR DE RESPOSTA ===
// Escuta erros, especificamente o 401 (Não Autorizado) para tentar o refresh
api.interceptors.response.use(
    (response) => response, // Se der sucesso, só repassa a resposta
    async (error) => {
        const originalRequest = error.config;

        // Se o erro for 401 e a requisição ainda não foi tentada novamente (_retry)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true; // Marca para não entrar em loop infinito

            try {
                // Tenta bater na rota de refresh do seu backend.
                // Como withCredentials está true, o cookie do refresh vai automaticamente.
                const refreshResponse = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                // Pega o novo token da resposta e atualiza a memória
                const newToken = refreshResponse.data.token;
                setAccessToken(newToken);

                // Atualiza o cabeçalho da requisição original que falhou e tenta de novo
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);

            } catch (refreshError) {
                // Se o refresh também falhar (ex: expirou), o usuário perde a sessão
                setAccessToken('');
                // Redireciona para o login forçando a barra pelo window, 
                // já que estamos fora do React Router aqui
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);