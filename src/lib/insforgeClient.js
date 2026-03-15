import { createClient } from '@insforge/sdk';

const client = createClient({
    baseUrl: import.meta.env.VITE_BACKEND_URL,
    anonKey: import.meta.env.VITE_BACKEND_KEY
});

export default client;