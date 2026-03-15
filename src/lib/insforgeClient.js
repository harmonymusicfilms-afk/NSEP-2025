import { createClient } from '@insforge/sdk';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://z7m852zi.us-east.insforge.app';
const backendKey = import.meta.env.VITE_BACKEND_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzM2MDB9.GqOHtEEA7Z7M6GZ8QanaertJ_ng8y9hEa6rqWwU4XF4';

const client = createClient({
    baseUrl: backendUrl,
    anonKey: backendKey
});

// Create a wrapper that exposes .db property for InsForge SDK
const clientWithDb = {
    ...client,
    db: {
        from: (table) => {
            if (import.meta.env.DEV) {
                console.log(`[NSEP DB] client.db.from("${table}")`);
            }
            return client.from(table);
        }
    },
    // Also expose .from() directly for Supabase compatibility
    from: (table) => {
        if (import.meta.env.DEV) {
            console.log(`[NSEP DB] client.from("${table}")`);
        }
        return client.from(table);
    }
};

// Expose client globally for browser console testing
if (typeof window !== 'undefined') {
    window.client = clientWithDb;
    if (import.meta.env.DEV) {
        console.log('[NSEP] InsForge client exposed globally as window.client');
        console.log('[NSEP] Testing client.db.from("centers").select("*")...');

        // Quick test to verify db property exists
        console.log('[NSEP] client.db exists:', clientWithDb.db !== undefined);
        console.log('[NSEP] client.db.from exists:', typeof clientWithDb.db?.from === 'function');
    }
}

export default clientWithDb;
