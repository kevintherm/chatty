import { Veloquent, createFetchAdapter, createLocalStorageAdapter, createEchoAdapter, createPopupOAuthLauncher } from '@veloquent/sdk';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

export { createPopupOAuthLauncher };

// @ts-ignore
window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: import.meta.env.VITE_BROADCAST_CONNECTION,
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    wsHost: import.meta.env.VITE_PUSHER_HOST,
    wsPort: import.meta.env.VITE_PUSHER_PORT,
    forceTLS: import.meta.env.VITE_PUSHER_SCHEME === 'https',
    cluster: import.meta.env.VITE_PUSHER_CLUSTER,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${import.meta.env.VITE_API_URL}/api/broadcasting/auth`,
    auth: {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('vp:token')}`
        }
    }
});

export const sdk = new Veloquent({
    apiUrl: import.meta.env.VITE_API_URL,
    http: createFetchAdapter(),
    storage: createLocalStorageAdapter(),
    realtime: createEchoAdapter(echo)
});

import { writable } from 'svelte/store';
export const user = writable(null);

export async function refreshUser() {
    try {
        const isAuth = await sdk.auth.isAuthenticated();
        const token = localStorage.getItem('vp:token');

        // Sync Echo headers with current token
        if (echo.connector?.options?.auth?.headers) {
            echo.connector.options.auth.headers.Authorization = token ? `Bearer ${token}` : '';
        }

        if (isAuth) {
            const userData = await sdk.auth.me('users');
            user.set(userData);
            return userData;
        } else {
            user.set(null);
        }
    } catch (e) {
        console.error('Auth refresh failed:', e);
        user.set(null);
    }
    return null;
}

refreshUser();
