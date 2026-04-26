import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('4000'),
    DATABASE_URL: z.string(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    JWT_SECRET: z.string().min(32),
    NEXTAUTH_SECRET: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_S3_BUCKET: z.string().optional(),
    STORAGE_MODE: z.enum(['local', 's3']).default('local'),
    PYTHON_SERVICE_URL: z.string().default('http://localhost:5001'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    FRONTEND_URL: z.string().default('http://localhost:3000'),
    BYPASS_AUTH: z.string().optional().default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;