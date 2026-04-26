import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';

export class GeminiService {
    private client: GoogleGenerativeAI;

    constructor() {
        this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');
    }

    async complete(prompt: string, timeoutMs = 8000): Promise<string> {
        const model = this.client.getGenerativeModel({
            model: 'gemini-1.5-pro',
            generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
            systemInstruction: 'You are a senior financial analyst AI. Always respond with valid JSON only. No markdown, no explanation outside JSON.',
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini timeout')), timeoutMs)
        );

        const completionPromise = model.generateContent(prompt);

        const result = await Promise.race([completionPromise, timeoutPromise]);
        return result.response.text();
    }

    isAvailable(): boolean {
        return !!env.GEMINI_API_KEY;
    }
}