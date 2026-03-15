import { createClient } from '@insforge/sdk';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://z7m852zi.us-east.insforge.app';
const backendKey = import.meta.env.VITE_BACKEND_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzM2MDB9.GqOHtEEA7Z7M6GZ8QanaertJ_ng8y9hEa6rqWwU4XF4';

export const insforge = createClient({
    baseUrl: backendUrl,
    anonKey: backendKey
}) as any;

// Expose client globally for browser console testing
if (typeof window !== 'undefined') {
    (window as any).client = insforge;
    (window as any).insforge = insforge;
    console.log('[NSEP] InsForge client exposed globally as window.client');
}

console.log('[NSEP Backend] Initialized with URL:', backendUrl);

// Simple event emitter for auth changes
const authListeners = new Set<(event: string, session: any) => void>();

const triggerAuthChange = async (event: string) => {
    const { data } = await insforge.auth.getCurrentSession();
    authListeners.forEach(listener => listener(event, data?.session || null));
};

// Wrap database operations with logging
const createLoggedTable = (tableName: string) => {
    const table = insforge.from(tableName);

    return {
        select: (columns?: string) => {
            console.log(`[NSEP DB] SELECT ${columns || '*'} FROM ${tableName}`);
            return table.select(columns);
        },
        insert: async (rows: any[]) => {
            console.log(`[NSEP DB] INSERT INTO ${tableName}:`, JSON.stringify(rows, null, 2).slice(0, 500));
            const result = await table.insert(rows);
            if (result.error) {
                console.error(`[NSEP DB] ${tableName} insert error:`, result.error);
            } else {
                console.log(`[NSEP DB] ${tableName} insert success:`, result.data);
            }
            return result;
        },
        update: (updates: any) => {
            console.log(`[NSEP DB] UPDATE ${tableName}:`, JSON.stringify(updates, null, 2).slice(0, 500));
            const query = table.update(updates);
            return {
                ...query,
                eq: (column: string, value: any) => {
                    console.log(`[NSEP DB] ${tableName} UPDATE WHERE ${column} = ${value}`);
                    const result = query.eq(column, value);
                    // Override then to log result
                    const originalThen = result.then?.bind(result);
                    result.then = ((resolve: any, reject: any) => {
                        originalThen?.((data: any) => {
                            console.log(`[NSEP DB] ${tableName} update result:`, data?.error ? `ERROR: ${data.error.message}` : 'success');
                            resolve(data);
                        }, (err: any) => {
                            console.error(`[NSEP DB] ${tableName} update exception:`, err);
                            reject(err);
                        });
                    }) as any;
                    return result;
                }
            };
        },
        delete: () => {
            console.log(`[NSEP DB] DELETE FROM ${tableName}`);
            const query = table.delete();
            return {
                ...query,
                eq: (column: string, value: any) => {
                    console.log(`[NSEP DB] ${tableName} DELETE WHERE ${column} = ${value}`);
                    return query.eq(column, value);
                }
            };
        },
        upsert: async (rows: any[]) => {
            console.log(`[NSEP DB] UPSERT INTO ${tableName}:`, JSON.stringify(rows, null, 2).slice(0, 500));
            const result = await table.upsert(rows);
            if (result.error) {
                console.error(`[NSEP DB] ${tableName} upsert error:`, result.error);
            } else {
                console.log(`[NSEP DB] ${tableName} upsert success:`, result.data);
            }
            return result;
        }
    };
};

export const client = {
    ...insforge,
    db: {
        from: (table: string) => {
            console.log(`[NSEP DB] Accessing table: ${table}`);
            return createLoggedTable(table);
        }
    },
    from: (table: string) => {
        console.log(`[NSEP DB] Accessing table: ${table}`);
        return createLoggedTable(table);
    },
    rpc: async (fn: string, args?: any) => {
        console.log(`[NSEP RPC] Calling function: ${fn}`, args);
        const result = await (insforge as any).rpc(fn, args);
        console.log(`[NSEP RPC] ${fn} result:`, result?.data, result?.error ? `ERROR: ${result.error.message}` : 'success');
        if (result?.error) {
            console.error(`[NSEP RPC] ${fn} error:`, result.error);
        }
        return result;
    },
    auth: {
        signUp: async (opts: any) => {
            console.log('[NSEP Auth] Signing up:', opts.email);
            const res = await insforge.auth.signUp(opts);
            if (res.error) {
                console.error('[NSEP Auth] Sign up error:', res.error);
            } else {
                console.log('[NSEP Auth] Sign up success:', res.data?.user?.id);
            }
            if (res.data) await triggerAuthChange('SIGNED_IN');
            return res;
        },
        signInWithPassword: async (opts: any) => {
            console.log('[NSEP Auth] Signing in:', opts.email);
            const res = await insforge.auth.signInWithPassword(opts);
            if (res.error) {
                console.error('[NSEP Auth] Sign in error:', res.error);
            } else {
                console.log('[NSEP Auth] Sign in success:', res.data?.user?.id);
            }
            if (res.data) await triggerAuthChange('SIGNED_IN');
            return res;
        },
        signOut: async () => {
            console.log('[NSEP Auth] Signing out');
            const res = await insforge.auth.signOut();
            if (res.error) {
                console.error('[NSEP Auth] Sign out error:', res.error);
            }
            triggerAuthChange('SIGNED_OUT');
            return res;
        },
        getSession: async () => {
            const { data, error } = await insforge.auth.getCurrentSession();
            console.log('[NSEP Auth] Get session:', error ? `ERROR: ${error.message}` : 'success');
            return { data: { session: data?.session || null }, error };
        },
        getUser: async () => {
            const { data, error } = await insforge.auth.getCurrentSession();
            console.log('[NSEP Auth] Get user:', error ? `ERROR: ${error.message}` : 'success');
            return { data: { user: data?.session?.user || null }, error };
        },
        onAuthStateChange: (callback: (event: string, session: any) => void) => {
            console.log('[NSEP Auth] Setting up auth state listener');
            authListeners.add(callback);
            insforge.auth.getCurrentSession().then(({ data }) => {
                callback('INITIAL_SESSION', data?.session || null);
            });
            return {
                data: {
                    subscription: {
                        unsubscribe: () => {
                            console.log('[NSEP Auth] Removing auth state listener');
                            authListeners.delete(callback);
                        }
                    }
                }
            };
        },
        resetPasswordForEmail: async (email: string, options?: any) => {
            console.log('[NSEP Auth] Reset password for:', email);
            const { error } = await insforge.auth.sendResetPasswordEmail({ email });
            if (error) {
                console.error('[NSEP Auth] Reset password error:', error);
            }
            return { error };
        },
        updateUser: async (args: { password?: string }) => {
            return { data: null, error: new Error('Please use reset password flow via InsForge settings.') };
        },
        getCurrentSession: async () => {
            const result = await insforge.auth.getCurrentSession();
            console.log('[NSEP Auth] Get current session:', result.error ? `ERROR: ${result.error.message}` : 'success');
            return result;
        }
    },
    functions: {
        invoke: async (functionName: string, options?: any) => {
            console.log(`[NSEP Functions] Invoking: ${functionName}`, options);
            const result = await (insforge as any).functions.invoke(functionName, options);
            console.log(`[NSEP Functions] ${functionName} result:`, result?.data, result?.error ? `ERROR: ${result.error.message}` : 'success');
            if (result?.error) {
                console.error(`[NSEP Functions] ${functionName} error:`, result.error);
            }
            return result;
        }
    },
    storage: {
        from: (bucketName: string) => {
            console.log(`[NSEP Storage] Accessing bucket: ${bucketName}`);
            const bucket = (insforge as any).storage.from(bucketName);
            return {
                upload: async (path: string, file: any, options?: any) => {
                    console.log(`[NSEP Storage] Uploading to ${bucketName}/${path}`);
                    const result = await bucket.upload(path, file);
                    if (result.error) {
                        console.error(`[NSEP Storage] Upload error:`, result.error);
                    } else {
                        console.log(`[NSEP Storage] Upload success:`, result.data);
                    }
                    return result;
                },
                getPublicUrl: (path: string) => {
                    const url = bucket.getPublicUrl(path);
                    console.log(`[NSEP Storage] Get public URL for ${path}:`, url);
                    return { data: { publicUrl: url } };
                },
                remove: async (paths: string[]) => {
                    if (!paths || paths.length === 0) return { data: null, error: null };
                    console.log(`[NSEP Storage] Removing from ${bucketName}:`, paths);
                    const result = await bucket.remove(paths[0]);
                    if (result.error) {
                        console.error(`[NSEP Storage] Remove error:`, result.error);
                    }
                    return result;
                }
            };
        }
    }
};

// Test connection on load
insforge.auth.getCurrentSession().then(({ data, error }) => {
    if (error) {
        console.error('[NSEP Backend] Connection test error:', error);
    } else {
        console.log('[NSEP Backend] Connection test success, session:', data?.session ? 'active' : 'none');
    }
}).catch((err) => {
    console.error('[NSEP Backend] Connection test failed:', err);
});
