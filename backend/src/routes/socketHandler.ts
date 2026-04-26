import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let io: SocketServer;

export function initSocket(httpServer: Server) {
    io = new SocketServer(httpServer, {
        cors: {
            origin: env.FRONTEND_URL,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Auth middleware for socket
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as any;
            socket.data.user = decoded;
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const user = socket.data.user;
        console.log(`Socket connected: ${user.email}`);

        // Join company room for broadcast
        socket.join(user.companyId);
        socket.join(`user:${user.id}`);

        // Handle budget updates
        socket.on('budget:subscribe', (budgetId: string) => {
            socket.join(`budget:${budgetId}`);
        });

        // Handle variance subscription
        socket.on('variance:subscribe', (period: string) => {
            socket.join(`variance:${user.companyId}:${period}`);
        });

        // AI progress events
        socket.on('ai:start', (data) => {
            io.to(user.companyId).emit('ai:thinking', { ...data, userId: user.id });
        });

        // Handle comments
        socket.on('comment:new', (data) => {
            io.to(user.companyId).emit('comment:broadcast', {
                ...data,
                userId: user.id,
                userName: user.name,
                timestamp: new Date().toISOString(),
            });
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${user.email}`);
        });
    });

    return io;
}

export function getIO(): SocketServer {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
}

// Helper to emit to a company
export function emitToCompany(companyId: string, event: string, data: any) {
    getIO().to(companyId).emit(event, data);
}

// Helper to emit processing progress
export function emitProgress(companyId: string, jobId: string, step: string, progress: number) {
    getIO().to(companyId).emit('job:progress', { jobId, step, progress, timestamp: new Date().toISOString() });
}