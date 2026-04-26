import cron from 'node-cron';
import { prisma } from '../config/db';
import { emitToCompany } from '../websocket/socketHandler';

export function startSyncJobs() {
    // Auto-refresh KPIs every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        console.log('[CRON] Running KPI refresh...');
        try {
            const companies = await prisma.company.findMany({ select: { id: true } });
            for (const company of companies) {
                emitToCompany(company.id, 'kpis:refreshed', { timestamp: new Date().toISOString() });
            }
        } catch (error) {
            console.error('[CRON] KPI refresh failed:', error);
        }
    });

    // Sync connected connectors daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
        console.log('[CRON] Running daily connector sync...');
        try {
            const connectors = await prisma.connector.findMany({
                where: { status: 'CONNECTED', syncFrequency: 'DAILY' },
            });

            for (const connector of connectors) {
                await prisma.connector.update({
                    where: { id: connector.id },
                    data: { status: 'SYNCING' },
                });

                // Simulate sync - real implementation would call OAuth APIs
                setTimeout(async () => {
                    try {
                        await prisma.connector.update({
                            where: { id: connector.id },
                            data: { status: 'CONNECTED', lastSync: new Date() },
                        });
                        emitToCompany(connector.companyId, 'connector:synced', {
                            connectorId: connector.id,
                            name: connector.name,
                        });
                    } catch (err) {
                        await prisma.connector.update({
                            where: { id: connector.id },
                            data: { status: 'ERROR' },
                        });
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('[CRON] Connector sync failed:', error);
        }
    });

    // Clean up old AI insights older than 30 days
    cron.schedule('0 3 * * 0', async () => {
        console.log('[CRON] Cleaning old AI insights...');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        await prisma.aIInsight.deleteMany({
            where: { createdAt: { lt: thirtyDaysAgo } },
        });
    });

    console.log('✅ Cron jobs started');
}