import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ReportService } from '../services/ReportService';

const reportService = new ReportService();

export const generateReport = async (req: AuthRequest, res: Response) => {
  try {
    const { type, title, period } = req.body;
    if (!type) return res.status(400).json({ error: 'Report type is required' });

    const report = await reportService.generate(
      req.user!.companyId,
      req.user!.id,
      type,
      title || `${type} Report`,
      period
    );
    return res.status(201).json(report);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getReports = async (req: AuthRequest, res: Response) => {
  try {
    const reports = await reportService.list(req.user!.companyId);
    return res.json(reports);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const downloadReport = async (req: AuthRequest, res: Response) => {
  try {
    const { format } = req.query;
    const buffer = await reportService.download(
      req.params.id,
      req.user!.companyId,
      (format as string) || 'excel'
    );

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=report-${req.params.id}.pdf`);
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=report-${req.params.id}.xlsx`);
    }

    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
