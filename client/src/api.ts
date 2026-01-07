const API_BASE = '/api';

export const api = {
    token: localStorage.getItem('subnews_token'),

    setToken(t: string) {
        this.token = t;
        localStorage.setItem('subnews_token', t);
    },

    logout() {
        this.token = null;
        localStorage.removeItem('subnews_token');
    },

    async request(path: string, options: any = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token ? { 'Authorization': this.token } : {}),
            ...options.headers
        };

        const resp = await fetch(`${API_BASE}${path}`, { ...options, headers });
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Request failed');
        }
        return resp.json();
    },

    auth: {
        login: (d: any) => api.request('/auth/login', { method: 'POST', body: JSON.stringify(d) }),
        register: (d: any) => api.request('/auth/register', { method: 'POST', body: JSON.stringify(d) })
    },

    subs: {
        list: () => api.request('/subs'),
        create: (d: any) => api.request('/subs', { method: 'POST', body: JSON.stringify(d) }),
        update: (id: string, d: any) => api.request(`/subs/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
        delete: (id: string) => api.request(`/subs/${id}`, { method: 'DELETE' }),
        test: (id: string) => api.request(`/subs/${id}/test`, { method: 'POST' }),
        preview: (d: any) => api.request('/subs/preview', { method: 'POST', body: JSON.stringify(d) })
    },

    logs: {
        list: () => api.request('/logs')
    }
};
