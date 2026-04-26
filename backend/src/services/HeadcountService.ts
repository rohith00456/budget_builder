import { prisma } from '../config/db';

export class HeadcountService {
    async getEmployees(companyId: string, filters?: { department?: string; status?: string }) {
        const where: any = { companyId };
        if (filters?.department) where.department = filters.department;
        if (filters?.status) where.status = filters.status;

        return prisma.employee.findMany({
            where,
            orderBy: [{ department: 'asc' }, { name: 'asc' }],
        });
    }

    async createEmployee(companyId: string, data: any) {
        return prisma.employee.create({
            data: { ...data, companyId },
        });
    }

    async updateEmployee(id: string, companyId: string, data: any) {
        const employee = await prisma.employee.findFirst({ where: { id, companyId } });
        if (!employee) throw new Error('Employee not found');
        return prisma.employee.update({ where: { id }, data });
    }

    async deleteEmployee(id: string, companyId: string) {
        const employee = await prisma.employee.findFirst({ where: { id, companyId } });
        if (!employee) throw new Error('Employee not found');
        return prisma.employee.delete({ where: { id } });
    }

    async getHeadcountPlan(companyId: string, fiscalYear: number) {
        return prisma.headcountPlan.findMany({
            where: { companyId, fiscalYear },
            orderBy: { department: 'asc' },
        });
    }

    async getHeadcountSummary(companyId: string) {
        const employees = await prisma.employee.findMany({ where: { companyId } });

        const byDepartment: Record<string, any> = {};

        employees.forEach((emp) => {
            if (!byDepartment[emp.department]) {
                byDepartment[emp.department] = {
                    department: emp.department,
                    total: 0,
                    active: 0,
                    onLeave: 0,
                    terminated: 0,
                    totalSalary: 0,
                    avgSalary: 0,
                    fullTime: 0,
                    partTime: 0,
                    contract: 0,
                };
            }
            const dept = byDepartment[emp.department];
            dept.total++;
            if (emp.status === 'ACTIVE') dept.active++;
            else if (emp.status === 'ON_LEAVE') dept.onLeave++;
            else if (emp.status === 'TERMINATED') dept.terminated++;

            if (emp.type === 'FULL_TIME') dept.fullTime++;
            else if (emp.type === 'PART_TIME') dept.partTime++;
            else if (emp.type === 'CONTRACT') dept.contract++;

            dept.totalSalary += Number(emp.salary || 0);
        });

        Object.values(byDepartment).forEach((dept: any) => {
            dept.avgSalary = dept.active > 0 ? dept.totalSalary / dept.active : 0;
        });

        return {
            totalEmployees: employees.length,
            activeEmployees: employees.filter((e) => e.status === 'ACTIVE').length,
            totalPayroll: employees.reduce((sum, e) => sum + Number(e.salary || 0), 0),
            byDepartment: Object.values(byDepartment),
        };
    }

    async bulkImport(companyId: string, employees: any[]) {
        const results = { created: 0, updated: 0, errors: [] as string[] };

        for (const emp of employees) {
            try {
                await prisma.employee.upsert({
                    where: { companyId_name: { companyId, name: emp.name } },
                    create: { ...emp, companyId },
                    update: emp,
                });
                results.created++;
            } catch (error: any) {
                results.errors.push(`Row ${emp.name}: ${error.message}`);
            }
        }

        return results;
    }
}