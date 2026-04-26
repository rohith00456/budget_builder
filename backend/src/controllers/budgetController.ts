import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { BudgetService } from '../services/BudgetService';

const budgetService = new BudgetService();

export const listBudgets = async (req: AuthRequest, res: Response) => {
  try {
    const budgets = await budgetService.getBudgetPlans(req.user!.companyId);
    return res.json(budgets);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const createBudget = async (req: AuthRequest, res: Response) => {
  try {
    const budget = await budgetService.createBudgetPlan(
      req.user!.companyId,
      req.user!.id,
      req.body
    );
    return res.status(201).json(budget);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getBudget = async (req: AuthRequest, res: Response) => {
  try {
    const budget = await budgetService.getBudgetPlan(req.params.id, req.user!.companyId);
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    return res.json(budget);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateBudget = async (req: AuthRequest, res: Response) => {
  try {
    const budget = await budgetService.updateBudgetPlan(
      req.params.id,
      req.user!.companyId,
      req.body
    );
    return res.json(budget);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const deleteBudget = async (req: AuthRequest, res: Response) => {
  try {
    await budgetService.deleteBudget(req.params.id, req.user!.companyId);
    return res.json({ message: 'Budget deleted' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const approveBudget = async (req: AuthRequest, res: Response) => {
  try {
    const budget = await budgetService.approveBudget(req.params.id, req.user!.companyId);
    return res.json(budget);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const lockBudget = async (req: AuthRequest, res: Response) => {
  try {
    const budget = await budgetService.lockBudget(req.params.id, req.user!.companyId);
    return res.json(budget);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const exportBudget = async (req: AuthRequest, res: Response) => {
  try {
    const buffer = await budgetService.exportToExcel(req.params.id, req.user!.companyId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=budget-${req.params.id}.xlsx`);
    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const copyBudget = async (req: AuthRequest, res: Response) => {
  try {
    const { fromPlanId, adjustmentPct } = req.body;
    if (!fromPlanId) return res.status(400).json({ error: 'fromPlanId is required' });

    const budget = await budgetService.copyFromPreviousYear(
      req.user!.companyId,
      req.user!.id,
      fromPlanId,
      adjustmentPct || 0
    );
    return res.status(201).json(budget);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};
