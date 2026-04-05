import prisma from "../../utils/prisma.js";

export async function DashboardService(id: number) {
    const totalTransactions = await prisma.transaction.count({
        where: {id}
    });

    const openDisputes = await prisma.dispute.count({
        where: {status: "ongoing", buyerId: id, OR: [{sellerId: id}]}
    });

    // const ongoingTransactions = await prisma.transaction.count({
    //     where: {status: "ONGOING", buyerId: id, OR: [{sellerId: id}]}
    // });
    return { totalTransactions, openDisputes };
}