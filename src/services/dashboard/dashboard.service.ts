import prisma from "../../utils/prisma.js";

export async function DashboardService(id: number, months?: number) {
    const user = await prisma.user.findUnique({
        where: { id },
        select: { email: true }
    });

    if (!user) {
        throw new Error("User not found");
    }

    const { email } = user;

    let dateFilter = {};
    if (months) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        dateFilter = { created_at: { gte: startDate } };
    }

    let createdAtFilter = {};
    if (months) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        createdAtFilter = { createdAt: { gte: startDate } };
    }

    // 1. Escrow balance(unpaid earnings)
    const unpaidEarningsAggr = await prisma.earnings.aggregate({
        where: {
            userId: id,
            transaction: {
                payment: {
                    is: {
                        status: "PENDING"
                    }
                }
            }
        },
        _sum: {
            amount: true
        }
    });
    const escrowBalance = unpaidEarningsAggr._sum.amount || 0;

    // 2. Total transactions
    const totalTransactions = await prisma.transaction.count({
        where: {
            OR: [{ creator_email: email }, { reciever_email: email }],
            ...dateFilter
        }
    });

    // 3. Count of total open disputes
    const openDisputes = await prisma.dispute.count({
        where: {
            status: "ongoing",
            OR: [
                { buyerId: id },
                { sellerId: id },
                { creatorId: id }
            ],
            ...createdAtFilter
        }
    });

    // 4. count of transaction with ongoing, cancelled and completed
    const transactionCounts = await prisma.transaction.groupBy({
        by: ['status'],
        where: {
            OR: [{ creator_email: email }, { reciever_email: email }],
            ...dateFilter
        },
        _count: {
            id: true
        }
    });

    let ongoingCount = 0;
    let cancelledCount = 0;
    let completedCount = 0;

    transactionCounts.forEach(t => {
        if (t.status === 'ONGOING') ongoingCount = t._count.id;
        if (t.status === 'CANCELED') cancelledCount = t._count.id;
        if (t.status === 'COMPLETED') completedCount = t._count.id;
    });

    // 5. transaction amount over time (based on Earnings)
    const userEarnings = await prisma.earnings.findMany({
        where: {
            userId: id,
            ...createdAtFilter
        },
        select: {
            createdAt: true,
            amount: true
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    const amountPerPeriod: Record<string, number> = {};
    const monthsToIterate = months || 12;
    const currentDate = new Date();
    
    // Initialize the last `n` months with 0
    for (let i = monthsToIterate - 1; i >= 0; i--) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const period = d.toISOString().slice(0, 7);
        amountPerPeriod[period] = 0;
    }

    userEarnings.forEach(e => {
        const period = e.createdAt.toISOString().slice(0, 7);
        if (amountPerPeriod[period] !== undefined) {
             amountPerPeriod[period] += e.amount;
        } else if (!months) {
             amountPerPeriod[period] = e.amount;
        }
    });

    return {
        escrowBalance,
        totalTransactions,
        openDisputes,
        transactionCount: {
            ongoing: ongoingCount,
            cancelled: cancelledCount,
            completed: completedCount
        },
        amountPerPeriod
    };
}