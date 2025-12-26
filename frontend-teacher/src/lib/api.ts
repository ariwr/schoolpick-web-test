const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add Authorization header if token exists
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            (headers as any)['Authorization'] = `Bearer ${token}`;
        }
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.detail || `API request failed: ${response.statusText}`);
    }

    return response.json();
}

export const api = {
    get: <T>(endpoint: string, options?: RequestInit) =>
        request<T>(endpoint, { ...options, method: 'GET' }),

    post: <T>(endpoint: string, body: any, options?: RequestInit) =>
        request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        }),

    patch: <T>(endpoint: string, body: any, options?: RequestInit) =>
        request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(body),
        }),

    delete: <T>(endpoint: string, options?: RequestInit) =>
        request<T>(endpoint, { ...options, method: 'DELETE' }),
};
