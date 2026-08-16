import type { Request, Response, NextFunction } from "express";
import { getWalletBalancesService } from "../../services/wallet/wallet-balance.service.js";

export const getWalletBalances = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as { id?: number; userId?: number } | undefined;
    const userId = Number(user?.id ?? user?.userId);

    if (!Number.isInteger(userId) || userId < 1) {
      res.status(401).json({
        message: "Unauthorized",
        success: false,
      });
      return;
    }

    const data = await getWalletBalancesService(userId);

    res.status(200).json({
      message: "Wallet balances retrieved successfully",
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error in getWalletBalances:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "User not found" ? 404 : 500;
    res.status(status).json({
      message,
      success: false,
    });
  }
};
