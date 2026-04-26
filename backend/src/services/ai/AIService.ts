import { GroqService } from './GroqService';
import { GeminiService } from './GeminiService';
import { AnthropicService } from './AnthropicService';
import { PROMPTS } from './prompts';
export interface AIRecommendation {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    expectedImpact: string;
    timeframe: string;
}

export interface AIAnalysis {
    summary: string;
    score: number;
    greenFlags: string[];
    redFlags: string[];
    recommendations: AIRecommendation[];
    detailedExplanation: string;
    confidence: number;
}

export interface AIResponse {
    provider: 'groq' | 'gemini' | 'anthropic';
    analysis: AIAnalysis;
}

type ProviderName = 'groq' | 'gemini' | 'anthropic';

export class AIService {
    private groq = new GroqService();
    private gemini = new GeminiService();
    private anthropic = new AnthropicService();

    private async callWithTimeout(promise: Promise<string>, ms: number): Promise<string> {
        let timeoutId: NodeJS.Timeout;
        const timeout = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(`Timeout exceeded (${ms}ms)`)), ms);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
    }

    // ── Core fallback chain ────────────────────────────
    private async callWithFallback(prompt: string): Promise<{ text: string; provider: ProviderName }> {
        const providers: { name: ProviderName; svc: { complete: (p: string) => Promise<string>; isAvailable: () => boolean } }[] = [
            { name: 'groq', svc: this.groq },
            { name: 'gemini', svc: this.gemini },
            { name: 'anthropic', svc: this.anthropic },
        ];

        const errors: string[] = [];

        for (const { name, svc } of providers) {
            if (!svc.isAvailable()) {
                errors.push(`${name}: no API key`);
                continue;
            }
            try {
                console.log(`[AI] Trying provider: ${name} with 8s timeout`);
                const text = await this.callWithTimeout(svc.complete(prompt), 8000);
                console.log(`[AI] Success with: ${name}`);
                return { text, provider: name };
            } catch (err: any) {
                console.warn(`[AI] ${name} failed: ${err.message}`);
                errors.push(`${name}: ${err.message}`);
            }
        }

        // All providers failed — return a safe fallback
        console.error('[AI] All providers failed:', errors);
        return {
            provider: 'groq',
            text: JSON.stringify({
                summary: 'AI analysis temporarily unavailable. Please check your API keys.',
                score: 50,
                greenFlags: [],
                redFlags: ['AI service unavailable'],
                recommendations: [{
                    priority: 'HIGH',
                    action: 'Check API keys in your .env file',
                    expectedImpact: 'Restore AI analysis capability',
                    timeframe: 'Immediately',
                }],
                detailedExplanation: `All AI providers failed: ${errors.join('; ')}`,
                confidence: 0,
            }),
        };
    }

    private parseResponse(text: string): AIAnalysis {
        try {
            // Strip markdown code fences if present
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleaned);
        } catch {
            return {
                summary: text.slice(0, 200),
                score: 50,
                greenFlags: [],
                redFlags: ['Could not parse AI response'],
                recommendations: [],
                detailedExplanation: text,
                confidence: 30,
            };
        }
    }

    // ── Public analysis methods ────────────────────────

    async analyzeVariance(varianceData: any, actualsData: any, period: string): Promise<AIResponse> {
        const prompt = PROMPTS.analyzeVariance(varianceData, period);
        const { text, provider } = await this.callWithFallback(prompt);
        return { provider, analysis: this.parseResponse(text) };
    }

    async generateBudgetSuggestions(historicalData: any, companyProfile: any): Promise<AIResponse> {
        const prompt = PROMPTS.budgetSuggestions(historicalData, companyProfile);
        const { text, provider } = await this.callWithFallback(prompt);
        return { provider, analysis: this.parseResponse(text) };
    }

    async analyzeBudgetHealth(budgetPlan: any, actuals: any): Promise<AIResponse> {
        const prompt = PROMPTS.budgetHealth(budgetPlan, actuals);
        const { text, provider } = await this.callWithFallback(prompt);
        return { provider, analysis: this.parseResponse(text) };
    }

    async forecastRevenue(historicalRevenue: any, growthFactors: any): Promise<AIResponse> {
        const prompt = PROMPTS.forecastRevenue(historicalRevenue, growthFactors);
        const { text, provider } = await this.callWithFallback(prompt);
        return { provider, analysis: this.parseResponse(text) };
    }

    async analyzeHeadcount(employees: any, budgetedHeadcount: any): Promise<AIResponse> {
        const prompt = PROMPTS.headcountAnalysis(employees, budgetedHeadcount);
        const { text, provider } = await this.callWithFallback(prompt);
        return { provider, analysis: this.parseResponse(text) };
    }

    async generateBoardNarrative(allFinancialData: any): Promise<AIResponse> {
        const prompt = PROMPTS.boardNarrative(allFinancialData);
        const { text, provider } = await this.callWithFallback(prompt);
        return { provider, analysis: this.parseResponse(text) };
    }

    async chatWithData(userQuestion: string, financialContext: any): Promise<AIResponse> {
        const prompt = PROMPTS.chatWithData(userQuestion, financialContext);
        const { text, provider } = await this.callWithFallback(prompt);
        return { provider, analysis: this.parseResponse(text) };
    }
}