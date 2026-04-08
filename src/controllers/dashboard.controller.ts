import { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/dashboard/dashboard.service.js";

export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as any;
        const userId = user?.id || user?.userId;

        if (!userId) {
            res.status(401).json({
                message: "Unauthorized",
                success: false,
            });
            return;
        }

        const monthsStr = req.query.months as string;
        let months: number | undefined = undefined;
        if (monthsStr) {
            months = parseInt(monthsStr, 10);
            if (isNaN(months)) months = undefined;
        }

        const data = await DashboardService(Number(userId), months);

        res.status(200).json({
            message: "Dashboard summary retrieved successfully",
            success: true,
            data
        });
    } catch (error) {
        console.error("Error in getDashboardSummary:", error);
        res.status(500).json({
            message: error instanceof Error ? error.message : "Internal server error",
            success: false,
        });
    }
};
