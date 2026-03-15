import { createClient } from '@insforge/sdk';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://z7m852zi.us-east.insforge.app';
const backendKey = import.meta.env.VITE_BACKEND_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzM2MDB9.GqOHtEEA7Z7M6GZ8QanaertJ_ng8y9hEa6rqWwU4XF4';

const client = createClient({
    baseUrl: backendUrl,
    anonKey: backendKey
});

// Expose client globally for browser console testing
if (typeof window !== 'undefined') {
    window.client = client;
    console.log('[NSEP] InsForge client exposed globally as window.client');
}

export default client;
