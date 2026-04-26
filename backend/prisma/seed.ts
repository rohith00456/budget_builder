import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    const company = await prisma.company.upsert({
        where: { id: 'demo-company-id' },
        update: {},
        create: {
            id: 'demo-company-id',
            name: 'Acme Corp India',
            fiscalYearStart: 4,
            currency: 'INR',
            plan: 'PRO',
        },
    });

    const hashedPassword = await bcrypt.hash('Demo@123456', 12);
    const user = await prisma.user.upsert({
        where: { email: 'admin@demo.com' },
        update: {},
        create: {
            email: 'admin@demo.com',
            name: 'Admin User',
            password: hashedPassword,
            role: 'ADMIN',
            companyId: company.id,
        },
    });

    const budgetPlan = await prisma.budgetPlan.upsert({
        where: { id: 'demo-budget-fy25' },
        update: {},
        create: {
            id: 'demo-budget-fy25',
            companyId: company.id,
            name: 'FY2025 Annual Budget',
            fiscalYear: 2025,
            status: 'APPROVED',
            totalRevenue: 50000000,
            totalExpenses: 35000000,
            createdBy: user.id,
        },
    });

    const lines = [
        { department: 'Sales', category: 'Direct Sales Revenue', type: 'REVENUE', jan: 3500000, feb: 3800000, mar: 4200000, apr: 4000000, may: 4500000, jun: 4800000, jul: 4200000, aug: 4500000, sep: 5000000, oct: 5200000, nov: 5500000, dec: 6800000, annual: 56000000 },
        { department: 'Engineering', category: 'Salaries', type: 'EXPENSE', jan: 1200000, feb: 1200000, mar: 1200000, apr: 1300000, may: 1300000, jun: 1300000, jul: 1400000, aug: 1400000, sep: 1400000, oct: 1500000, nov: 1500000, dec: 1500000, annual: 15200000 },
        { department: 'Marketing', category: 'Digital Advertising', type: 'EXPENSE', jan: 500000, feb: 600000, mar: 700000, apr: 600000, may: 650000, jun: 700000, jul: 600000, aug: 700000, sep: 800000, oct: 900000, nov: 1000000, dec: 1200000, annual: 8950000 },
        { department: 'Operations', category: 'Office & Admin', type: 'EXPENSE', jan: 200000, feb: 200000, mar: 200000, apr: 200000, may: 200000, jun: 200000, jul: 200000, aug: 200000, sep: 200000, oct: 200000, nov: 200000, dec: 200000, annual: 2400000 },
        { department: 'Human Resources', category: 'Salaries', type: 'EXPENSE', jan: 800000, feb: 800000, mar: 800000, apr: 900000, may: 900000, jun: 900000, jul: 900000, aug: 900000, sep: 900000, oct: 1000000, nov: 1000000, dec: 1000000, annual: 10800000 },
    ];

    for (const line of lines) {
        await prisma.budgetLine.create({
            data: { ...line, budgetPlanId: budgetPlan.id },
        });
    }

    const currentPeriod = new Date().toISOString().slice(0, 7);
    const actuals = [
        { department: 'Sales', category: 'Direct Sales Revenue', amount: 4100000 },
        { department: 'Engineering', category: 'Salaries', amount: 1250000 },
        { department: 'Marketing', category: 'Digital Advertising', amount: 780000 },
        { department: 'Operations', category: 'Office & Admin', amount: 195000 },
        { department: 'Human Resources', category: 'Salaries', amount: 920000 },
    ];

    for (const actual of actuals) {
        await prisma.actuals.upsert({
            where: {
                companyId_period_department_category_accountCode: {
                    companyId: company.id,
                    period: currentPeriod,
                    department: actual.department,
                    category: actual.category,
                    accountCode: '',
                },
            },
            update: { amount: actual.amount },
            create: { ...actual, companyId: company.id, period: currentPeriod, accountCode: '', source: 'SEED' },
        });
    }

    const employees = [
        { name: 'Rahul Sharma', title: 'Senior Engineer', department: 'Engineering', salary: 1800000, type: 'FULL_TIME', location: 'Bangalore', status: 'ACTIVE', startDate: new Date('2022-04-01') },
        { name: 'Priya Nair', title: 'Marketing Manager', department: 'Marketing', salary: 1500000, type: 'FULL_TIME', location: 'Mumbai', status: 'ACTIVE', startDate: new Date('2021-07-15') },
        { name: 'Amit Patel', title: 'Sales Executive', department: 'Sales', salary: 1200000, type: 'FULL_TIME', location: 'Delhi', status: 'ACTIVE', startDate: new Date('2023-01-10') },
        { name: 'Deepa Krishnan', title: 'HR Manager', department: 'Human Resources', salary: 1400000, type: 'FULL_TIME', location: 'Chennai', status: 'ACTIVE', startDate: new Date('2020-09-01') },
    ];

    for (const emp of employees) {
        await prisma.employee.upsert({
            where: { companyId_name: { companyId: company.id, name: emp.name } },
            update: {},
            create: { ...emp, companyId: company.id },
        });
    }

    const kpis = [
        { name: 'Monthly Revenue', value: 4100000, unit: 'INR', target: 4000000, trend: 'UP' },
        { name: 'Burn Rate', value: 3145000, unit: 'INR', target: 3000000, trend: 'UP' },
        { name: 'Headcount', value: 4, unit: 'count', target: 5, trend: 'FLAT' },
        { name: 'Revenue per Employee', value: 1025000, unit: 'INR', target: 1000000, trend: 'UP' },
    ];

    for (const kpi of kpis) {
        await prisma.kPI.upsert({
            where: { companyId_name_period: { companyId: company.id, name: kpi.name, period: currentPeriod } },
            update: { value: kpi.value },
            create: { ...kpi, companyId: company.id, period: currentPeriod, source: 'SEED' },
        });
    }

    console.log('✅ Seed complete!');
    console.log('   Login: admin@demo.com / Demo@123456');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });