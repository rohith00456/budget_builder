import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AIService } from '../services/ai/AIService';
import { VarianceService } from '../services/VarianceService';
import { ForecastService } from '../services/ForecastService';
import { HeadcountService } from '../services/HeadcountService';
import { prisma } from '../config/db';

const aiService = new AIService();
const varianceService = new VarianceService();
const forecastService = new ForecastService();
const headcountService = new HeadcountService();

export const analyzeVariance = async (req: AuthRequest, res: Response) => {
  try {
    const { period, varianceId } = req.body;
    const companyId = req.user!.companyId;

    const variances = varianceId
      ? [await prisma.variance.findFirst({ where: { id: varianceId, companyId } })]
      : await varianceService.getVariances(companyId, period);

    if (!variances || variances.length === 0) {
      return res.status(400).json({ error: 'No variance data found' });
    }

    const result = await aiService.analyzeVariance(variances, null, period || 'current');

    await prisma.aIInsight.create({
      data: {
        companyId,
        type: 'VARIANCE_ANALYSIS',
        period: period || new Date().toISOString().slice(0, 7),
        content: result.analysis as any,
        provider: result.provider,
        tokensUsed: 500,
      },
    });

    if (varianceId && variances[0]) {
      await varianceService.updateAIExplanation(
        varianceId,
        result.analysis.detailedExplanation,
        result.analysis.recommendations.map(r => r.action).join('; ')
      );
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getBudgetSuggestions = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const company = await prisma.company.findUnique({ where: { id: companyId } });

    const actuals = await prisma.actuals.findMany({
      where: { companyId },
      orderBy: { period: 'desc' },
      take: 200,
    });

    const result = await aiService.generateBudgetSuggestions(actuals, company);

    await prisma.aIInsight.create({
      data: {
        companyId,
        type: 'BUDGET_SUGGESTIONS',
        period: new Date().toISOString().slice(0, 7),
        content: result.analysis as any,
        provider: result.provider,
      },
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const checkBudgetHealth = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { budgetPlanId } = req.body;

    const budget = budgetPlanId
      ? await prisma.budgetPlan.findFirst({ where: { id: budgetPlanId, companyId }, include: { lines: true } })
      : await prisma.budgetPlan.findFirst({ where: { companyId }, orderBy: { fiscalYear: 'desc' }, include: { lines: true } });

    const actuals = await prisma.actuals.findMany({
      where: { companyId },
      orderBy: { period: 'desc' },
      take: 100,
    });

    const result = await aiService.analyzeBudgetHealth(budget, actuals);

    await prisma.aIInsight.create({
      data: {
        companyId,
        type: 'BUDGET_HEALTH',
        period: new Date().toISOString().slice(0, 7),
        content: result.analysis as any,
        provider: result.provider,
      },
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getForecast = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { months } = req.body;

    const forecast = await forecastService.getForecast(companyId, months || 6);

    const historicalRevenue = await prisma.actuals.findMany({
      where: { companyId },
      orderBy: { period: 'asc' },
    });

    const aiResult = await aiService.forecastRevenue(historicalRevenue, { forecastMonths: months || 6 });

    return res.json({ pythonForecast: forecast, aiAnalysis: aiResult });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const analyzeHeadcount = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const employees = await headcountService.getEmployees(companyId);
    const plans = await headcountService.getHeadcountPlan(companyId, new Date().getFullYear());

    const result = await aiService.analyzeHeadcount(employees, plans);

    await prisma.aIInsight.create({
      data: {
        companyId,
        type: 'HEADCOUNT_ANALYSIS',
        period: new Date().toISOString().slice(0, 7),
        content: result.analysis as any,
        provider: result.provider,
      },
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const generateBoardNarrative = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const [budget, actuals, variances, kpis, employees] = await Promise.all([
      prisma.budgetPlan.findFirst({ where: { companyId }, orderBy: { fiscalYear: 'desc' }, include: { lines: true } }),
      prisma.actuals.findMany({ where: { companyId }, orderBy: { period: 'desc' }, take: 50 }),
      prisma.variance.findMany({ where: { companyId }, orderBy: { period: 'desc' }, take: 30 }),
      prisma.kPI.findMany({ where: { companyId }, orderBy: { period: 'desc' }, take: 20 }),
      prisma.employee.findMany({ where: { companyId, status: 'ACTIVE' } }),
    ]);

    const financialData = { budget, actuals, variances, kpis, employees };
    const result = await aiService.generateBoardNarrative(financialData);

    await prisma.aIInsight.create({
      data: {
        companyId,
        type: 'BOARD_NARRATIVE',
        period: new Date().toISOString().slice(0, 7),
        content: result.analysis as any,
        provider: result.provider,
      },
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const chatWithData = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { question, period } = req.body;

    if (!question) return res.status(400).json({ error: 'question is required' });

    const currentPeriod = period || new Date().toISOString().slice(0, 7);

    const [budget, actuals, variances, kpis] = await Promise.all([
      prisma.budgetPlan.findFirst({ where: { companyId }, orderBy: { fiscalYear: 'desc' }, include: { lines: true } }),
      prisma.actuals.findMany({ where: { companyId }, orderBy: { period: 'desc' }, take: 30 }),
      prisma.variance.findMany({ where: { companyId }, orderBy: { period: 'desc' }, take: 20 }),
      prisma.kPI.findMany({ where: { companyId }, orderBy: { period: 'desc' }, take: 10 }),
    ]);

    const context = {
      period: currentPeriod,
      budgetPlan: budget ? { name: budget.name, fiscalYear: budget.fiscalYear, totalRevenue: budget.totalRevenue, totalExpenses: budget.totalExpenses } : null,
      recentActuals: actuals.slice(0, 10),
      recentVariances: variances.slice(0, 10),
      kpis,
    };

    const result = await aiService.chatWithData(question, context);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getInsights = async (req: AuthRequest, res: Response) => {
  try {
    const insights = await prisma.aIInsight.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return res.json(insights);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
