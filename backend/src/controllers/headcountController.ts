import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { HeadcountService } from '../services/HeadcountService';
import { prisma } from '../config/db';

const headcountService = new HeadcountService();

export const getEmployees = async (req: AuthRequest, res: Response) => {
    try {
        const { department, status } = req.query;
        const employees = await headcountService.getEmployees(req.user!.companyId, {
            department: department as string,
            status: status as string,
        });
        return res.json(employees);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const createEmployee = async (req: AuthRequest, res: Response) => {
    try {
        const employee = await headcountService.createEmployee(req.user!.companyId, req.body);
        return res.status(201).json(employee);
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const updateEmployee = async (req: AuthRequest, res: Response) => {
    try {
        const employee = await headcountService.updateEmployee(req.params.id, req.user!.companyId, req.body);
        return res.json(employee);
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const deleteEmployee = async (req: AuthRequest, res: Response) => {
    try {
        await headcountService.deleteEmployee(req.params.id, req.user!.companyId);
        return res.json({ message: 'Employee deleted' });
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const getHeadcountPlan = async (req: AuthRequest, res: Response) => {
    try {
        const { year } = req.query;
        const plan = await headcountService.getHeadcountPlan(
            req.user!.companyId,
            parseInt(year as string) || new Date().getFullYear()
        );
        return res.json(plan);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const getHeadcountSummary = async (req: AuthRequest, res: Response) => {
    try {
        const summary = await headcountService.getHeadcountSummary(req.user!.companyId);
        return res.json(summary);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const bulkImportHeadcount = async (req: AuthRequest, res: Response) => {
    try {
        const { employees } = req.body;
        if (!employees) return res.status(400).json({ error: 'employees array required' });
        const result = await headcountService.bulkImport(req.user!.companyId, employees);
        return res.json(result);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};