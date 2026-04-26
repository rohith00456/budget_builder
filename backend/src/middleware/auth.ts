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
        // PERMANENT AUTH BYPASS AS REQUESTED
        const user = await prisma.user.findFirst({
            where: { email: 'admin@demo.com' },
            select: { id: true, email: true, role: true, companyId: true },
        });

        if (user) {
            req.user = user;
            return next();
        } else {
            // Fallback to any user if admin@demo.com isn't found
            const anyUser = await prisma.user.findFirst({
                select: { id: true, email: true, role: true, companyId: true },
            });
            if (anyUser) {
                req.user = anyUser;
                return next();
            }
        }

        return res.status(500).json({ error: 'No users found in database to bypass auth.' });
    } catch (error) {
        next(error);
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