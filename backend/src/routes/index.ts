import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { aiLimiter, authLimiter } from '../middleware/rateLimit';

import { register, login, getMe, logout } from '../controllers/authController';
import { uploadFile, getUploadStatus, saveColumnMapping, getFilePreview, listUploads } from '../controllers/uploadController';
import { listBudgets, createBudget, getBudget, updateBudget, deleteBudget, approveBudget, lockBudget, exportBudget, copyBudget } from '../controllers/budgetController';
import { getActuals, getActualsByPeriod, importActuals, deleteActuals } from '../controllers/actualsController';
import { getVariances, calculateVariances, getVarianceSummary } from '../controllers/varianceController';
import { analyzeVariance, getBudgetSuggestions, checkBudgetHealth, getForecast, analyzeHeadcount, generateBoardNarrative, chatWithData, getInsights } from '../controllers/aiController';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, getHeadcountPlan, getHeadcountSummary, bulkImportHeadcount } from '../controllers/headcountController';
import { generateReport, getReports, downloadReport } from '../controllers/reportController';
import { getConnectors, connectConnector, syncConnector, disconnectConnector } from '../controllers/connectorController';

import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';

const router = Router();

// Auth
router.post('/auth/register', authLimiter, register);
router.post('/auth/login', authLimiter, login);
router.post('/auth/logout', logout);
router.get('/auth/me', authenticate, getMe);

// Upload
router.get('/upload', authenticate, listUploads);
router.post('/upload/file', authenticate, upload.single('file'), uploadFile);
router.get('/upload/status/:jobId', authenticate, getUploadStatus);
router.post('/upload/map-columns', authenticate, saveColumnMapping);
router.get('/upload/preview/:fileId', authenticate, getFilePreview);

// Budget
router.get('/budget', authenticate, listBudgets);
router.post('/budget', authenticate, createBudget);
router.get('/budget/:id', authenticate, getBudget);
router.put('/budget/:id', authenticate, updateBudget);
router.delete('/budget/:id', authenticate, deleteBudget);
router.post('/budget/:id/approve', authenticate, approveBudget);
router.post('/budget/:id/lock', authenticate, lockBudget);
router.get('/budget/:id/export', authenticate, exportBudget);
router.post('/budget/copy', authenticate, copyBudget);

// Actuals
router.get('/actuals', authenticate, getActuals);
router.get('/actuals/:period', authenticate, getActualsByPeriod);
router.post('/actuals/import', authenticate, importActuals);
router.delete('/actuals/:period', authenticate, deleteActuals);

// Variance
router.get('/variance', authenticate, getVariances);
router.post('/variance/calculate', authenticate, calculateVariances);
router.get('/variance/summary', authenticate, getVarianceSummary);

// AI
router.post('/ai/analyze-variance', authenticate, aiLimiter, analyzeVariance);
router.post('/ai/budget-suggestions', authenticate, aiLimiter, getBudgetSuggestions);
router.post('/ai/health-check', authenticate, aiLimiter, checkBudgetHealth);
router.post('/ai/forecast', authenticate, aiLimiter, getForecast);
router.post('/ai/headcount-analysis', authenticate, aiLimiter, analyzeHeadcount);
router.post('/ai/board-narrative', authenticate, aiLimiter, generateBoardNarrative);
router.post('/ai/chat', authenticate, aiLimiter, chatWithData);
router.get('/ai/insights', authenticate, getInsights);

// Headcount
router.get('/headcount', authenticate, getEmployees);
router.post('/headcount', authenticate, createEmployee);
router.put('/headcount/:id', authenticate, updateEmployee);
router.delete('/headcount/:id', authenticate, deleteEmployee);
router.get('/headcount/plan', authenticate, getHeadcountPlan);
router.get('/headcount/summary', authenticate, getHeadcountSummary);
router.post('/headcount/import', authenticate, bulkImportHeadcount);

// Reports
router.get('/reports', authenticate, getReports);
router.post('/reports/generate', authenticate, generateReport);
router.get('/reports/:id/download', authenticate, downloadReport);

// Connectors
router.get('/connectors', authenticate, getConnectors);
router.post('/connectors/:type/connect', authenticate, connectConnector);
router.post('/connectors/:id/sync', authenticate, syncConnector);
router.delete('/connectors/:id', authenticate, disconnectConnector);

// KPIs
router.get('/kpis', authenticate, async (req: AuthRequest, res: Response) => {
    const kpis = await prisma.kPI.findMany({ where: { companyId: req.user!.companyId }, orderBy: { period: 'desc' } });
    res.json(kpis);
});

router.post('/kpis', authenticate, async (req: AuthRequest, res: Response) => {
    const kpi = await prisma.kPI.create({ data: { ...req.body, companyId: req.user!.companyId } });
    res.status(201).json(kpi);
});

router.put('/kpis/:id', authenticate, async (req: AuthRequest, res: Response) => {
    const kpi = await prisma.kPI.update({ where: { id: req.params.id }, data: req.body });
    res.json(kpi);
});

export default router;