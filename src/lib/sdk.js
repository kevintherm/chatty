import { Veloquent, createFetchAdapter, createLocalStorageAdapter, createEchoAdapter, createPopupOAuthLauncher } from '@veloquent/sdk';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

export { createPopupOAuthLauncher };

// @ts-ignore
window.Pusher = Pusher;

const echo = new Echo({
    broadcaster: 'reverb',
    key: 'test',
    wsHost: 'localhost',
    wsPort: 8080,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: 'http://localhost:8000/api/broadcasting/auth',
    auth: {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('vp:token')}`
        }
    }
});

export const sdk = new Veloquent({
    apiUrl: 'http://localhost:8000',
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
