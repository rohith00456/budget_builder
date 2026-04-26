import rateLimit from 'express-rate-limit';
import { redis } from '../config/redis';

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'AI rate limit exceeded. Please wait before sending more requests.' },
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts. Please try again in 15 minutes.' },
});