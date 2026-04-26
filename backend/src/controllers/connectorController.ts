import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/db';

export const getConnectors = async (req: AuthRequest, res: Response) => {
    try {
        const connectors = await prisma.connector.findMany({
            where: { companyId: req.user!.companyId },
            orderBy: { name: 'asc' },
        });
        // Don't expose credentials
        return res.json(connectors.map(({ credentials: _c, ...c }) => c));
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const connectConnector = async (req: AuthRequest, res: Response) => {
    try {
        const { type } = req.params;
        const { name, credentials, syncFrequency } = req.body;

        const connector = await prisma.connector.upsert({
            where: { companyId_type: { companyId: req.user!.companyId, type } },
            create: {
                companyId: req.user!.companyId,
                type,
                name: name || type,
                credentials: credentials || {},
                status: 'CONNECTED',
                syncFrequency: syncFrequency || 'DAILY',
            },
            update: {
                credentials: credentials || {},
                status: 'CONNECTED',
                name: name || type,
            },
        });

        const { credentials: _c, ...safeConnector } = connector;
        return res.json(safeConnector);
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const syncConnector = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const connector = await prisma.connector.findFirst({
            where: { id, companyId: req.user!.companyId },
        });

        if (!connector) return res.status(404).json({ error: 'Connector not found' });

        // Update status to syncing
        await prisma.connector.update({
            where: { id },
            data: { status: 'SYNCING' },
        });

        // Simulate sync (would trigger actual OAuth/API sync here)
        setTimeout(async () => {
            await prisma.connector.update({
                where: { id },
                data: { status: 'CONNECTED', lastSync: new Date() },
            });
        }, 3000);

        return res.json({ message: 'Sync started', connectorId: id });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const disconnectConnector = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const connector = await prisma.connector.findFirst({
            where: { id, companyId: req.user!.companyId },
        });

        if (!connector) return res.status(404).json({ error: 'Connector not found' });

        await prisma.connector.delete({ where: { id } });
        return res.json({ message: 'Connector disconnected' });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};