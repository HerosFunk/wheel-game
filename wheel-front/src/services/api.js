import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'https://wheel-game.azurewebsites.net/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('useroken');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export const login = (password) => api.post('/auth/login', { password });
export const logout = () => api.post('/auth/logout');

export const getWheels = async (params = {}) => {
    try {
        const response = await api.get('/wheels', { 
            params: {
                sortBy: params.sortBy,
                sortOrder: params.sortOrder,
                favoriteOnly: params.favoriteOnly
            }
        });
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error fetching wheels:', error);
        return [];
    }
};

export const getWheel = async (id) => {
    try {
        const response = await api.get(`/wheels/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching wheel:', error);
        throw error;
    }
};

export const createWheel = (wheelData) => api.post('/wheels', wheelData);
export const updateWheel = (id, wheelData) => api.put(`/wheels/${id}`, wheelData);
export const deleteWheel = (id) => api.delete(`/wheels/${id}`);
export const spinWheel = (id) => api.post(`/wheels/spin/${id}`);

export const toggleElementActive = (wheelId, elementId) => 
    api.put(`/wheels/${wheelId}/elements/${elementId}/toggle`);

export const updateElementStatus = toggleElementActive;

export const setAllElementsActive = (wheelId) => 
    api.put(`/wheels/${wheelId}/elements/set-all-active`);

export const resetResults = (wheelId) => 
    api.put(`/wheels/${wheelId}/results/reset`);

export const toggleFavorite = (id) => api.put(`/wheels/${id}/favorite`);
export const getFavoriteWheels = () => api.get('/wheels/favorites');

export default api; 