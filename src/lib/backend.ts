import { createClient } from '@insforge/sdk';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://z7m852zi.us-east.insforge.app';
const backendKey = import.meta.env.VITE_BACKEND_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzM2MDB9.GqOHtEEA7Z7M6GZ8QanaertJ_ng8y9hEa6rqWwU4XF4';

export const insforge = createClient({
    baseUrl: backendUrl,
    anonKey: backendKey
});

// Simple event emitter for auth changes
const authListeners = new Set<(event: string, session: any) => void>();

const triggerAuthChange = async (event: string) => {
    const { data } = await insforge.auth.getCurrentSession();
    authListeners.forEach(listener => listener(event, data?.session || null));
};

export const client = {
    ...insforge,
    from: (table: string) => insforge.database.from(table),
    rpc: (fn: string, args?: any) => insforge.database.rpc(fn, args),
    auth: {
        signUp: async (opts: any) => {
            const res = await insforge.auth.signUp(opts);
            if (res.data) await triggerAuthChange('SIGNED_IN');
            return res;
        },
        signInWithPassword: async (opts: any) => {
            const res = await insforge.auth.signInWithPassword(opts);
            if (res.data) await triggerAuthChange('SIGNED_IN');
            return res;
        },
        signOut: async () => {
            const res = await insforge.auth.signOut();
            triggerAuthChange('SIGNED_OUT');
            return res;
        },
        getSession: async () => {
            const { data, error } = await insforge.auth.getCurrentSession();
            return { data: { session: data?.session || null }, error };
        },
        getUser: async () => {
            const { data, error } = await insforge.auth.getCurrentSession();
            return { data: { user: data?.session?.user || null }, error };
        },
        onAuthStateChange: (callback: (event: string, session: any) => void) => {
            authListeners.add(callback);
            // Initial call
            insforge.auth.getCurrentSession().then(({ data }) => {
                callback('INITIAL_SESSION', data?.session || null);
            });
            return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
        },
        resetPasswordForEmail: async (email: string, options?: any) => {
            const { error } = await insforge.auth.sendResetPasswordEmail({ email });
            return { error };
        },
        updateUser: async (args: { password?: string }) => {
            return { data: null, error: new Error('Please use reset password flow via InsForge settings.') };
        }
    },
    storage: {
        ...insforge.storage,
        from: (bucketName: string) => {
            const bucket = insforge.storage.from(bucketName);
            return {
                upload: async (path: string, file: any, options?: any) => {
                    return bucket.upload(path, file);
                },
                getPublicUrl: (path: string) => {
                    const url = bucket.getPublicUrl(path);
                    return { data: { publicUrl: url } };
                },
                remove: async (paths: string[]) => {
                    if (!paths || paths.length === 0) return { data: null, error: null };
                    return bucket.remove(paths[0]);
                }
            };
        }
    }
};
