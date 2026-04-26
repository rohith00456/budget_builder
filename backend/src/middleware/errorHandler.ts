import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (
    err: Error | AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            status: 'error',
        });
    }

    // Multer errors
    if (err.message?.includes('File type not supported') || err.message?.includes('Too large')) {
        return res.status(400).json({ error: err.message });
    }

    // Prisma errors
    if ((err as any).code === 'P2002') {
        return res.status(409).json({ error: 'A record with this data already exists.' });
    }

    if ((err as any).code === 'P2025') {
        return res.status(404).json({ error: 'Record not found.' });
    }

    console.error('Unhandled error:', err);
    return res.status(500).json({
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    });
};