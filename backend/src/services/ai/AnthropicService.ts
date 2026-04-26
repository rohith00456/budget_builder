import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';

export class AnthropicService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async complete(prompt: string, timeoutMs = 8000): Promise<string> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Anthropic timeout')), timeoutMs)
    );

    const completionPromise = this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: 'You are a senior financial analyst AI. Always respond with valid JSON only. No markdown, no explanation outside JSON.',
      messages: [{ role: 'user', content: prompt }],
    });

    const response = await Promise.race([completionPromise, timeoutPromise]);
    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  }

  isAvailable(): boolean {
    return !!env.ANTHROPIC_API_KEY;
  }
}