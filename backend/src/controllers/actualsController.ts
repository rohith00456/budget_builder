import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/db';

export const getActuals = async (req: AuthRequest, res: Response) => {
    try {
        const { period, department, category } = req.query;
        const where: any = { companyId: req.user!.companyId };
        if (period) where.period = period;
        if (department) where.department = department;
        if (category) where.category = category;

        const actuals = await prisma.actuals.findMany({
            where,
            orderBy: [{ period: 'desc' }, { department: 'asc' }],
        });

        return res.json(actuals);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const getActualsByPeriod = async (req: AuthRequest, res: Response) => {
    try {
        const { period } = req.params;
        const actuals = await prisma.actuals.findMany({
            where: { companyId: req.user!.companyId, period },
        });
        return res.json(actuals);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const importActuals = async (req: AuthRequest, res: Response) => {
    try {
        const { records } = req.body;
        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: 'records array is required' });
        }

        const companyId = req.user!.companyId;
        let imported = 0;
        const errors: string[] = [];

        for (const record of records) {
            try {
                await prisma.actuals.upsert({
                    where: {
                        companyId_period_department_category_accountCode: {
                            companyId,
                            period: record.period,
                            department: record.department,
                            category: record.category,
                            accountCode: record.accountCode || '',
                        },
                    },
                    create: { ...record, companyId, source: record.source || 'MANUAL' },
                    update: { amount: record.amount },
                });
                imported++;
            } catch (err: any) {
                errors.push(`Row ${imported + 1}: ${err.message}`);
            }
        }

        return res.json({ imported, errors, total: records.length });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const deleteActuals = async (req: AuthRequest, res: Response) => {
    try {
        const { period } = req.params;
        await prisma.actuals.deleteMany({
            where: { companyId: req.user!.companyId, period },
        });
        return res.json({ message: `Actuals for ${period} deleted` });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};