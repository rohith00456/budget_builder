import { prisma } from '../config/db';
import { redis } from '../config/redis';
import ExcelJS from 'exceljs';

export class BudgetService {
    async createBudgetPlan(companyId: string, userId: string, data: {
        name: string;
        fiscalYear: number;
        lines?: any[];
    }) {
        const plan = await prisma.budgetPlan.create({
            data: {
                companyId,
                name: data.name,
                fiscalYear: data.fiscalYear,
                status: 'DRAFT',
                createdBy: userId,
                totalRevenue: 0,
                totalExpenses: 0,
            },
        });

        if (data.lines && data.lines.length > 0) {
            await this.upsertBudgetLines(plan.id, data.lines);
            await this.recalculateTotals(plan.id);
        }

        await redis.del(`budget:${companyId}:list`);
        return plan;
    }

    async getBudgetPlans(companyId: string) {
        const cached = await redis.get(`budget:${companyId}:list`);
        if (cached) return JSON.parse(cached);

        const plans = await prisma.budgetPlan.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { lines: true } },
            },
        });

        await redis.setEx(`budget:${companyId}:list`, 300, JSON.stringify(plans));
        return plans;
    }

    async getBudgetPlan(id: string, companyId: string) {
        const plan = await prisma.budgetPlan.findFirst({
            where: { id, companyId },
            include: {
                lines: { orderBy: [{ department: 'asc' }, { category: 'asc' }] },
            },
        });
        if (!plan) throw new Error('Budget plan not found');
        return plan;
    }

    async updateBudgetPlan(id: string, companyId: string, data: any) {
        const plan = await prisma.budgetPlan.findFirst({ where: { id, companyId } });
        if (!plan) throw new Error('Budget plan not found');
        if (plan.status === 'LOCKED') throw new Error('Cannot modify a locked budget plan');

        const updated = await prisma.budgetPlan.update({
            where: { id },
            data: {
                name: data.name,
                fiscalYear: data.fiscalYear,
            },
        });

        if (data.lines) {
            await this.upsertBudgetLines(id, data.lines);
            await this.recalculateTotals(id);
        }

        await redis.del(`budget:${companyId}:list`);
        return updated;
    }

    async upsertBudgetLines(planId: string, lines: any[]) {
        const ops = lines.map((line) =>
            prisma.budgetLine.upsert({
                where: { id: line.id || '' },
                create: {
                    budgetPlanId: planId,
                    department: line.department,
                    category: line.category,
                    subCategory: line.subCategory || null,
                    accountCode: line.accountCode || null,
                    type: line.type || 'EXPENSE',
                    jan: line.jan || 0, feb: line.feb || 0, mar: line.mar || 0,
                    apr: line.apr || 0, may: line.may || 0, jun: line.jun || 0,
                    jul: line.jul || 0, aug: line.aug || 0, sep: line.sep || 0,
                    oct: line.oct || 0, nov: line.nov || 0, dec: line.dec || 0,
                    annual: line.annual || 0,
                    notes: line.notes || null,
                },
                update: {
                    department: line.department,
                    category: line.category,
                    jan: line.jan || 0, feb: line.feb || 0, mar: line.mar || 0,
                    apr: line.apr || 0, may: line.may || 0, jun: line.jun || 0,
                    jul: line.jul || 0, aug: line.aug || 0, sep: line.sep || 0,
                    oct: line.oct || 0, nov: line.nov || 0, dec: line.dec || 0,
                    annual: line.annual || 0,
                    notes: line.notes || null,
                },
            })
        );

        return prisma.$transaction(ops);
    }

    async recalculateTotals(planId: string) {
        const lines = await prisma.budgetLine.findMany({ where: { budgetPlanId: planId } });

        const totalRevenue = lines
            .filter((l) => l.type === 'REVENUE')
            .reduce((sum, l) => sum + Number(l.annual), 0);

        const totalExpenses = lines
            .filter((l) => l.type === 'EXPENSE')
            .reduce((sum, l) => sum + Number(l.annual), 0);

        return prisma.budgetPlan.update({
            where: { id: planId },
            data: { totalRevenue, totalExpenses },
        });
    }

    async approveBudget(id: string, companyId: string) {
        const plan = await prisma.budgetPlan.findFirst({ where: { id, companyId } });
        if (!plan) throw new Error('Budget plan not found');
        if (plan.status === 'LOCKED') throw new Error('Budget is already locked');

        return prisma.budgetPlan.update({
            where: { id },
            data: { status: 'APPROVED' },
        });
    }

    async lockBudget(id: string, companyId: string) {
        return prisma.budgetPlan.update({
            where: { id },
            data: { status: 'LOCKED' },
        });
    }

    async deleteBudget(id: string, companyId: string) {
        const plan = await prisma.budgetPlan.findFirst({ where: { id, companyId } });
        if (!plan) throw new Error('Budget plan not found');
        if (plan.status === 'LOCKED') throw new Error('Cannot delete a locked budget');

        await prisma.budgetLine.deleteMany({ where: { budgetPlanId: id } });
        await prisma.budgetPlan.delete({ where: { id } });
        await redis.del(`budget:${companyId}:list`);
    }

    async exportToExcel(id: string, companyId: string): Promise<Buffer> {
        const plan = await this.getBudgetPlan(id, companyId);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Budget');

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Header row
        sheet.addRow(['Department', 'Category', 'Sub-Category', 'Account Code', 'Type', ...months, 'Annual', 'Notes']);

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e2129' },
        };

        plan.lines.forEach((line: any) => {
            sheet.addRow([
                line.department, line.category, line.subCategory || '',
                line.accountCode || '', line.type,
                line.jan, line.feb, line.mar, line.apr, line.may, line.jun,
                line.jul, line.aug, line.sep, line.oct, line.nov, line.dec,
                line.annual, line.notes || '',
            ]);
        });

        sheet.columns.forEach((col) => { col.width = 14; });

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    async copyFromPreviousYear(companyId: string, userId: string, fromPlanId: string, adjustmentPct = 0) {
        const sourcePlan = await this.getBudgetPlan(fromPlanId, companyId);

        const newPlan = await this.createBudgetPlan(companyId, userId, {
            name: `${sourcePlan.name} (Copy +${adjustmentPct}%)`,
            fiscalYear: sourcePlan.fiscalYear + 1,
        });

        const multiplier = 1 + adjustmentPct / 100;

        const newLines = sourcePlan.lines.map((line: any) => ({
            department: line.department,
            category: line.category,
            subCategory: line.subCategory,
            accountCode: line.accountCode,
            type: line.type,
            jan: Number(line.jan) * multiplier,
            feb: Number(line.feb) * multiplier,
            mar: Number(line.mar) * multiplier,
            apr: Number(line.apr) * multiplier,
            may: Number(line.may) * multiplier,
            jun: Number(line.jun) * multiplier,
            jul: Number(line.jul) * multiplier,
            aug: Number(line.aug) * multiplier,
            sep: Number(line.sep) * multiplier,
            oct: Number(line.oct) * multiplier,
            nov: Number(line.nov) * multiplier,
            dec: Number(line.dec) * multiplier,
            annual: Number(line.annual) * multiplier,
            notes: line.notes,
        }));

        await this.upsertBudgetLines(newPlan.id, newLines);
        await this.recalculateTotals(newPlan.id);
        return newPlan;
    }
}