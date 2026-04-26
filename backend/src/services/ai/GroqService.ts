import Groq from 'groq-sdk';
import { env } from '../../config/env';

export class GroqService {
    private client: Groq;

    constructor() {
        this.client = new Groq({ apiKey: env.GROQ_API_KEY });
    }

    async complete(prompt: string, timeoutMs = 8000): Promise<string> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await this.client.chat.completions.create(
                {
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a senior financial analyst AI. Always respond with valid JSON only. No markdown, no explanation outside JSON.',
                        },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.3,
                    max_tokens: 2000,
                },
                { signal: controller.signal }
            );

            clearTimeout(timer);
            return response.choices[0]?.message?.content || '';
        } catch (error: any) {
            clearTimeout(timer);
            if (error.name === 'AbortError') throw new Error('Groq timeout');
            throw error;
        }
    }

    isAvailable(): boolean {
        return !!env.GROQ_API_KEY;
    }
}