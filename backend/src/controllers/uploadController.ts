import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/db';
import { StorageService } from '../services/StorageService';
import axios from 'axios';
import { env } from '../config/env';
import { getIO } from '../websocket/socketHandler';

const storage = new StorageService();

export const uploadFile = async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file provided' });

        const { companyId } = req.user!;
        const fileType = req.body.fileType || 'UNKNOWN';

        const uploadedFile = await prisma.uploadedFile.create({
            data: {
                companyId,
                fileName: file.originalname,
                fileType,
                fileSize: file.size,
                filePath: file.path,
                status: 'PROCESSING',
            },
        });

        // Emit start event
        getIO().to(companyId).emit('upload:started', { fileId: uploadedFile.id, fileName: file.originalname });

        // Process async
        processFileAsync(uploadedFile.id, file.path, file.originalname, companyId, fileType);

        return res.status(201).json({
            fileId: uploadedFile.id,
            message: 'File uploaded and processing started',
            status: 'PROCESSING',
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

async function processFileAsync(fileId: string, filePath: string, fileName: string, companyId: string, fileType: string) {
    const io = getIO();

    try {
        io.to(companyId).emit('upload:progress', { fileId, step: 'Parsing file...', progress: 20 });

        const ext = fileName.split('.').pop()?.toLowerCase();
        const endpoint = ext === 'csv' ? '/process/csv' : '/process/excel';

        const FormData = (await import('form-data')).default;
        const fs = await import('fs');
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('file_type', fileType);

        const response = await axios.post(`${env.PYTHON_SERVICE_URL}${endpoint}`, form, {
            headers: form.getHeaders(),
            timeout: 60000,
        });

        io.to(companyId).emit('upload:progress', { fileId, step: 'Cleaning data...', progress: 50 });

        const { rows, columns, data_quality_score, errors } = response.data;

        io.to(companyId).emit('upload:progress', { fileId, step: 'Storing to database...', progress: 80 });

        await prisma.uploadedFile.update({
            where: { id: fileId },
            data: {
                status: 'COMPLETED',
                processedRows: rows?.length || 0,
                errors: errors || [],
                mappings: { columns, data_quality_score },
            },
        });

        io.to(companyId).emit('upload:completed', {
            fileId,
            rows: rows?.length || 0,
            columns,
            dataQualityScore: data_quality_score,
            preview: rows?.slice(0, 10),
            progress: 100,
        });
    } catch (error: any) {
        await prisma.uploadedFile.update({
            where: { id: fileId },
            data: { status: 'FAILED', errors: [{ message: error.message }] },
        });

        io.to(companyId).emit('upload:failed', { fileId, error: error.message });
    }
}

export const getUploadStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { jobId } = req.params;
        const file = await prisma.uploadedFile.findFirst({
            where: { id: jobId, companyId: req.user!.companyId },
        });

        if (!file) return res.status(404).json({ error: 'Upload not found' });
        return res.json(file);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const saveColumnMapping = async (req: AuthRequest, res: Response) => {
    try {
        const { fileId, mappings } = req.body;

        const file = await prisma.uploadedFile.update({
            where: { id: fileId },
            data: { mappings },
        });

        return res.json(file);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const getFilePreview = async (req: AuthRequest, res: Response) => {
    try {
        const { fileId } = req.params;
        const file = await prisma.uploadedFile.findFirst({
            where: { id: fileId, companyId: req.user!.companyId },
        });

        if (!file) return res.status(404).json({ error: 'File not found' });

        const mappings = file.mappings as any;
        return res.json({
            columns: mappings?.columns || [],
            preview: mappings?.preview || [],
            dataQualityScore: mappings?.data_quality_score || 0,
            processedRows: file.processedRows,
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const listUploads = async (req: AuthRequest, res: Response) => {
    try {
        const files = await prisma.uploadedFile.findMany({
            where: { companyId: req.user!.companyId },
            orderBy: { uploadedAt: 'desc' },
        });
        return res.json(files);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};