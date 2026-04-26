import 'dotenv/config';
import http from 'http';
import app from './app';
import { initSocket } from './websocket/socketHandler';
import { startSyncJobs } from './jobs/syncJobs';
import { prisma } from './config/db';
import { redis } from './config/redis';
import { env } from './config/env';

const PORT = parseInt(env.PORT, 10) || 4000;
console.log('🔍 DATABASE_URL:', env.DATABASE_URL);

async function bootstrap() {
    try {
        // Try connecting to database
        try {
            await prisma.$connect();
            console.log('✅ Database connected');
        } catch (dbErr: any) {
            console.warn('⚠️ Database connection failed:', dbErr.message);
            console.warn('   The API will start but database operations will fail.');
            console.warn('   Make sure PostgreSQL is running and DATABASE_URL is correct.');
        }

        // Try connecting to Redis (optional) disabled for now
        /*
        try {
            await redis.ping();
            console.log('✅ Redis connected');
        } catch {
            console.warn('⚠️ Redis not available — caching disabled');
        }
        */

        const server = http.createServer(app);

        initSocket(server);
        console.log('✅ WebSocket server ready');

        try {
            startSyncJobs();
        } catch {
            console.warn('⚠️ Cron jobs failed to start (node-cron may not be installed)');
        }

        server.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`📡 Environment: ${env.NODE_ENV}`);
            console.log(`🔗 API: http://localhost:${PORT}/api`);
            console.log(`❤️  Health: http://localhost:${PORT}/health\n`);
        });

        const gracefulShutdown = async (signal: string) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            server.close(async () => {
                try { await prisma.$disconnect(); } catch { }
                try { await redis.quit(); } catch { }
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

bootstrap();
