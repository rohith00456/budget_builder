import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let io: SocketServer;

export function initSocket(httpServer: Server) {
    io = new SocketServer(httpServer, {
        cors: {
            origin: [env.FRONTEND_URL, 'http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        if (!token) return next(new Error('Authentication required'));

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

        socket.join(user.companyId);
        socket.join(`user:${user.id}`);

        socket.on('budget:subscribe', (budgetId: string) => {
            socket.join(`budget:${budgetId}`);
        });

        socket.on('variance:subscribe', (period: string) => {
            socket.join(`variance:${user.companyId}:${period}`);
        });

        socket.on('ai:start', (data) => {
            io.to(user.companyId).emit('ai:thinking', { ...data, userId: user.id });
        });

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

export function emitToCompany(companyId: string, event: string, data: any) {
    getIO().to(companyId).emit(event, data);
}

export function emitProgress(companyId: string, jobId: string, step: string, progress: number) {
    getIO().to(companyId).emit('job:progress', { jobId, step, progress, timestamp: new Date().toISOString() });
}
