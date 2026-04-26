import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes/index';
import { env } from './config/env';

const app = express();

app.use(helmet());

app.use(cors({
    origin: [env.FRONTEND_URL, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use('/api', apiLimiter);
app.use('/api', routes);

const healthResponse = (_req: express.Request, res: express.Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
};
app.get('/health', healthResponse);
app.get('/api/health', healthResponse);

app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

export default app;
