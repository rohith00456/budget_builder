import { prisma } from '../config/db';
import { redis } from '../config/redis';

export class VarianceService {
    async calculateVariances(companyId: string, period: string, budgetPlanId: string) {
        const [year, month] = period.split('-').map(Number);
        const monthKey = this.getMonthKey(month);

        const budgetLines = await prisma.budgetLine.findMany({
            where: { budgetPlanId },
        });

        const actuals = await prisma.actuals.findMany({
            where: { companyId, period },
        });

        const actualsMap = new Map<string, number>();
        actuals.forEach((a) => {
            const key = `${a.department}::${a.category}`;
            actualsMap.set(key, (actualsMap.get(key) || 0) + Number(a.amount));
        });

        const variances = [];

        for (const line of budgetLines) {
            const budgetAmount = Number((line as any)[monthKey] || 0);
            const key = `${line.department}::${line.category}`;
            const actualAmount = actualsMap.get(key) || 0;

            const variance = actualAmount - budgetAmount;
            const variancePct = budgetAmount !== 0 ? (variance / Math.abs(budgetAmount)) * 100 : 0;

            let status: 'FAV' | 'UNFAV' | 'ONPLAN' = 'ONPLAN';
            if (Math.abs(variancePct) < 2) {
                status = 'ONPLAN';
            } else if (line.type === 'REVENUE') {
                status = variance >= 0 ? 'FAV' : 'UNFAV';
            } else {
                status = variance <= 0 ? 'FAV' : 'UNFAV';
            }

            variances.push({
                companyId,
                period,
                department: line.department,
                category: line.category,
                budgetAmount,
                actualAmount,
                variance,
                variancePct,
                status,
                aiExplanation: null,
                aiRecommendation: null,
            });
        }

        // Upsert all variances
        const ops = variances.map((v) =>
            prisma.variance.upsert({
                where: {
                    companyId_period_department_category: {
                        companyId: v.companyId,
                        period: v.period,
                        department: v.department,
                        category: v.category,
                    },
                },
                create: v,
                update: {
                    budgetAmount: v.budgetAmount,
                    actualAmount: v.actualAmount,
                    variance: v.variance,
                    variancePct: v.variancePct,
                    status: v.status,
                },
            })
        );

        await prisma.$transaction(ops);
        await redis.del(`variance:${companyId}:${period}`);

        return variances;
    }

    async getVariances(companyId: string, period?: string, department?: string) {
        const cacheKey = `variance:${companyId}:${period || 'all'}`;
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const where: any = { companyId };
        if (period) where.period = period;
        if (department) where.department = department;

        const variances = await prisma.variance.findMany({
            where,
            orderBy: [{ period: 'desc' }, { department: 'asc' }],
        });

        await redis.setEx(cacheKey, 300, JSON.stringify(variances));
        return variances;
    }

    async getVarianceSummary(companyId: string, period: string) {
        const variances = await prisma.variance.findMany({
            where: { companyId, period },
        });

        const summary = {
            totalBudget: 0,
            totalActual: 0,
            totalVariance: 0,
            favCount: 0,
            unfavCount: 0,
            onPlanCount: 0,
            byDepartment: {} as Record<string, any>,
            topVariances: [] as any[],
        };

        for (const v of variances) {
            summary.totalBudget += Number(v.budgetAmount);
            summary.totalActual += Number(v.actualAmount);
            summary.totalVariance += Number(v.variance);

            if (v.status === 'FAV') summary.favCount++;
            else if (v.status === 'UNFAV') summary.unfavCount++;
            else summary.onPlanCount++;

            if (!summary.byDepartment[v.department]) {
                summary.byDepartment[v.department] = { budget: 0, actual: 0, variance: 0 };
            }
            summary.byDepartment[v.department].budget += Number(v.budgetAmount);
            summary.byDepartment[v.department].actual += Number(v.actualAmount);
            summary.byDepartment[v.department].variance += Number(v.variance);
        }

        summary.topVariances = variances
            .sort((a, b) => Math.abs(Number(b.variancePct)) - Math.abs(Number(a.variancePct)))
            .slice(0, 10);

        return summary;
    }

    async updateAIExplanation(id: string, explanation: string, recommendation: string) {
        return prisma.variance.update({
            where: { id },
            data: { aiExplanation: explanation, aiRecommendation: recommendation },
        });
    }

    private getMonthKey(month: number): string {
        const keys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        return keys[month - 1];
    }
}