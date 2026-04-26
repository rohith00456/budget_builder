import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name, companyName } = req.body;

        if (!email || !password || !name || !companyName) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(409).json({ error: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 12);

        const company = await prisma.company.create({
            data: {
                name: companyName,
                fiscalYearStart: 4, // April for India
                currency: 'INR',
                plan: 'FREE',
            },
        });

        const user = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: 'ADMIN',
                companyId: company.id,
            },
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, companyId: user.companyId },
            env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            company: { id: company.id, name: company.name },
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { company: true },
        });

        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, companyId: user.companyId },
            env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            company: { id: user.company?.id, name: user.company?.name },
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true, email: true, name: true, role: true, companyId: true,
                company: true
            }
        });

        return res.json(user);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const logout = (_req: Request, res: Response) => {
    res.clearCookie('token');
    return res.json({ message: 'Logged out successfully' });
};