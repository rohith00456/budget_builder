import { prisma } from '../config/db';
import axios from 'axios';
import { env } from '../config/env';

export class ForecastService {
    async getForecast(companyId: string, months: number = 6) {
        const actuals = await prisma.actuals.findMany({
            where: { companyId },
            orderBy: { period: 'asc' },
        });

        if (actuals.length < 3) {
            return { error: 'Insufficient historical data for forecasting. Need at least 3 months.' };
        }

        const revenueByPeriod: Record<string, number> = {};
        actuals.forEach((a) => {
            if (!revenueByPeriod[a.period]) revenueByPeriod[a.period] = 0;
            // Assume positive actuals are revenue for simplification
            revenueByPeriod[a.period] += Number(a.amount);
        });

        const historicalData = Object.entries(revenueByPeriod).map(([period, amount]) => ({
            period,
            amount,
        }));

        try {
            const response = await axios.post(`${env.PYTHON_SERVICE_URL}/forecast`, {
                historical_data: historicalData,
                forecast_months: months,
            });
            return response.data;
        } catch (error) {
            // Fallback to simple linear projection
            return this.simpleLinearForecast(historicalData, months);
        }
    }

    private simpleLinearForecast(data: { period: string; amount: number }[], months: number) {
        const n = data.length;
        const amounts = data.map((d) => d.amount);
        const mean = amounts.reduce((a, b) => a + b, 0) / n;
        const growth = n > 1 ? (amounts[n - 1] - amounts[0]) / (n - 1) : 0;

        const lastPeriod = data[n - 1].period;
        const [lastYear, lastMonth] = lastPeriod.split('-').map(Number);

        const forecasts = [];
        for (let i = 1; i <= months; i++) {
            const futureMonth = ((lastMonth - 1 + i) % 12) + 1;
            const futureYear = lastYear + Math.floor((lastMonth - 1 + i) / 12);
            const period = `${futureYear}-${String(futureMonth).padStart(2, '0')}`;
            const projected = Math.max(0, amounts[n - 1] + growth * i);
            const confidence = Math.max(50, 90 - i * 5);

            forecasts.push({
                period,
                projected,
                lower: projected * 0.85,
                upper: projected * 1.15,
                confidence,
            });
        }

        return {
            forecasts,
            method: 'linear_regression',
            historical_mean: mean,
            growth_rate: n > 1 ? ((growth / amounts[0]) * 100).toFixed(2) : '0',
        };
    }

    async getKPIs(companyId: string) {
        const kpis = await prisma.kPI.findMany({
            where: { companyId },
            orderBy: { period: 'desc' },
        });
        return kpis;
    }

    async upsertKPI(companyId: string, data: any) {
        return prisma.kPI.upsert({
            where: {
                companyId_name_period: {
                    companyId,
                    name: data.name,
                    period: data.period,
                },
            },
            create: { ...data, companyId },
            update: { value: data.value, target: data.target, trend: data.trend },
        });
    }
}