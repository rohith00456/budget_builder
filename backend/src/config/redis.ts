import { env } from './env';

// Redis wrapper that gracefully handles when Redis is unavailable
let redisClient: any = null;
let isConnected = false;

async function getClient() {
    if (redisClient && isConnected) return redisClient;

    try {
        const { createClient } = await import('redis');
        redisClient = createClient({ url: env.REDIS_URL });
        redisClient.on('error', () => {
            isConnected = false;
        });
        await redisClient.connect();
        isConnected = true;
        return redisClient;
    } catch {
        isConnected = false;
        return null;
    }
}

export const redis = {
    async get(key: string): Promise<string | null> {
        const client = await getClient();
        if (!client) return null;
        try { return await client.get(key); } catch { return null; }
    },
    async set(key: string, value: string): Promise<void> {
        const client = await getClient();
        if (!client) return;
        try { await client.set(key, value); } catch { }
    },
    async setEx(key: string, seconds: number, value: string): Promise<void> {
        const client = await getClient();
        if (!client) return;
        try { await client.setEx(key, seconds, value); } catch { }
    },
    async del(key: string): Promise<void> {
        const client = await getClient();
        if (!client) return;
        try { await client.del(key); } catch { }
    },
    async ping(): Promise<string> {
        const client = await getClient();
        if (!client) throw new Error('Redis not available');
        return client.ping();
    },
    async quit(): Promise<void> {
        if (redisClient && isConnected) {
            try { await redisClient.quit(); } catch { }
        }
    },
};