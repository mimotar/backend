import type { Request, Response } from "express";
import { GlobalError } from "../../middlewares/error/GlobalErrorHandler.js";
import {
  getBankAccountService,
  listNigerianBanksService,
  saveBankAccountService,
} from "../../services/withdrawal/bank-account.service.js";
import {
  adminCompleteManualWithdrawalService,
  adminFailManualWithdrawalService,
  confirmWithdrawalService,
  handleTransferWebhookService,
  listMyWithdrawalsService,
  listPendingManualWithdrawalsService,
  requestWithdrawalService,
} from "../../services/withdrawal/withdrawal-flow.service.js";
import { env } from "../../config/env.js";

function authUserId(req: Request): number {
  const user = req.user as { id?: number; userId?: number } | undefined;
  const id = Number(user?.id ?? user?.userId);
  if (!Number.isInteger(id) || id < 1) {
    throw new GlobalError("Unauthorized", "UnauthorizedError", 401, true);
  }
  return id;
}

function handleError(res: Response, error: unknown) {
  if (error instanceof GlobalError) {
    return res.status(error.statusCode).json({
      message: error.message,
      name: error.name,
      success: false,
    });
  }
  console.error(error);
  return res.status(500).json({
    message: error instanceof Error ? error.message : "Internal server error",
    success: false,
  });
}

export const listBanksController = async (_req: Request, res: Response) => {
  try {
    const banks = await listNigerianBanksService();
    return res.status(200).json({ message: "Banks fetched", success: true, data: banks });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getMyBankController = async (req: Request, res: Response) => {
  try {
    const bank = await getBankAccountService(authUserId(req));
    return res.status(200).json({ message: "Bank account fetched", success: true, data: bank });
  } catch (error) {
    return handleError(res, error);
  }
};

export const saveBankController = async (req: Request, res: Response) => {
  try {
    const { bankCode, accountNumber, bankName } = req.body || {};
    if (!bankCode || !accountNumber) {
      return res.status(400).json({
        message: "bankCode and accountNumber are required",
        success: false,
      });
    }
    const bank = await saveBankAccountService(authUserId(req), {
      bankCode: String(bankCode),
      accountNumber: String(accountNumber),
      bankName: bankName ? String(bankName) : undefined,
    });
    return res.status(200).json({
      message: "Bank account saved successfully",
      success: true,
      data: bank,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const requestWithdrawalController = async (req: Request, res: Response) => {
  try {
    const amount = Number(req.body?.amount);
    const currency = String(req.body?.currency || "").toUpperCase();
    if (currency !== "NGN" && currency !== "USD") {
      return res.status(400).json({
        message: "currency must be NGN or USD",
        success: false,
      });
    }
    const data = await requestWithdrawalService(
      authUserId(req),
      amount,
      currency as "NGN" | "USD"
    );
    return res.status(200).json({
      message: data.message,
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const confirmWithdrawalController = async (req: Request, res: Response) => {
  try {
    const withdrawalId = Number(req.params.id);
    const otp = String(req.body?.otp || "");
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "OTP must be exactly 6 digits",
        success: false,
      });
    }
    const data = await confirmWithdrawalService(
      authUserId(req),
      withdrawalId,
      otp
    );
    return res.status(200).json({
      message: (data as any).message || "Withdrawal confirmed",
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listMyWithdrawalsController = async (req: Request, res: Response) => {
  try {
    const data = await listMyWithdrawalsService(authUserId(req));
    return res.status(200).json({
      message: "Withdrawals retrieved",
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const transferWebhookController = async (req: Request, res: Response) => {
  const signature = req.headers["verif-hash"];
  if (signature !== env.FLW_WEBHOOK_SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const event = String(req.body?.event || req.body?.["event.type"] || "");
    const isTransferEvent =
      event.toLowerCase().includes("transfer") ||
      req.body?.data?.reference?.toString?.().startsWith?.("wd_");

    if (!isTransferEvent && req.body?.data?.status && !req.body?.data?.reference) {
      return res.status(200).json({ success: true, ignored: true });
    }

    const result = await handleTransferWebhookService(req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Transfer webhook error:", error);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
};

export const adminListPendingManualController = async (_req: Request, res: Response) => {
  try {
    const data = await listPendingManualWithdrawalsService();
    return res.status(200).json({
      message: "Pending manual withdrawals",
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const adminCompleteWithdrawalController = async (req: Request, res: Response) => {
  try {
    const data = await adminCompleteManualWithdrawalService(
      Number(req.params.id),
      typeof req.body?.note === "string" ? req.body.note : undefined
    );
    return res.status(200).json({
      message: "Manual withdrawal marked completed",
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const adminFailWithdrawalController = async (req: Request, res: Response) => {
  try {
    const reason = String(req.body?.reason || "").trim();
    if (!reason) {
      return res.status(400).json({
        message: "reason is required",
        success: false,
      });
    }
    const data = await adminFailManualWithdrawalService(
      Number(req.params.id),
      reason
    );
    return res.status(200).json({
      message: "Manual withdrawal failed and wallet refunded",
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
