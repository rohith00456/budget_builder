import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/db';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        companyId: string;
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (env.BYPASS_AUTH === 'true') {
            const user = await prisma.user.findFirst({
                where: { email: 'admin@demo.com' },
                select: { id: true, email: true, role: true, companyId: true },
            });

            if (user) {
                req.user = user;
                return next();
            }
        }

        const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as {
            id: string;
            email: string;
            role: string;
            companyId: string;
        };

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true, companyId: true },
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user as { id: string; email: string; role: string; companyId: string };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const requireRole = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};