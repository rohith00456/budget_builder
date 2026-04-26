import 'dotenv/config';
import http from 'http';
import app from './app';
import { initSocket } from './websocket/socketHandler';
import { startSyncJobs } from './jobs/syncJobs';
import { prisma } from './config/db';
import { redis } from './config/redis';
import { env } from './config/env';

const PORT = parseInt(env.PORT, 10) || 4000;

async function bootstrap() {
    try {
        // Test DB connection
        await prisma.$connect();
        console.log('✅ Database connected');

        // Test Redis connection
        await redis.ping();
        console.log('✅ Redis connected');

        // Create HTTP server
        const server = http.createServer(app);

        // Init Socket.io
        initSocket(server);
        console.log('✅ WebSocket server ready');

        // Start cron jobs
        startSyncJobs();

        // Start server
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📡 Environment: ${env.NODE_ENV}`);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            server.close(async () => {
                await prisma.$disconnect();
                await redis.quit();
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