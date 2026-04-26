import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { VarianceService } from '../services/VarianceService';

const varianceService = new VarianceService();

export const getVariances = async (req: AuthRequest, res: Response) => {
    try {
        const { period, department } = req.query;
        const variances = await varianceService.getVariances(
            req.user!.companyId,
            period as string,
            department as string
        );
        return res.json(variances);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const calculateVariances = async (req: AuthRequest, res: Response) => {
    try {
        const { period, budgetPlanId } = req.body;
        if (!period || !budgetPlanId) {
            return res.status(400).json({ error: 'period and budgetPlanId are required' });
        }

        const variances = await varianceService.calculateVariances(
            req.user!.companyId,
            period,
            budgetPlanId
        );

        return res.json({ calculated: variances.length, variances });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const getVarianceSummary = async (req: AuthRequest, res: Response) => {
    try {
        const { period } = req.query;
        if (!period) return res.status(400).json({ error: 'period is required' });

        const summary = await varianceService.getVarianceSummary(
            req.user!.companyId,
            period as string
        );
        return res.json(summary);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};