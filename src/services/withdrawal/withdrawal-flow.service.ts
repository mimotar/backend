import { Prisma } from "../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import { EmailType } from "../../emails/templates/emailTypes.brevo.js";
import { GlobalError } from "../../middlewares/error/GlobalErrorHandler.js";
import { generateSixDigitString } from "../../utils/OTPGenerator.js";
import prisma from "../../utils/prisma.js";
import { sendEmail } from "../emailService.js";
import { flutterwaveInitiateTransfer } from "./flutterwave-payout.service.js";

const WITHDRAWAL_OTP_EXPIRY_MS = 15 * 60 * 1000;
const MIN_WITHDRAWAL = { NGN: 5000, USD: 50 } as const;
const ACTIVE_WITHDRAWAL_STATUSES = [
  "OTP_PENDING",
  "PROCESSING",
  "PENDING_MANUAL",
] as const;

type WithdrawCurrency = "NGN" | "USD";

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === "number" ? value : value.toNumber();
}

function generateReference(userId: number) {
  return `wd_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function assertWithdrawEligible(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userKYC: true },
  });

  if (!user) {
    throw new GlobalError("User not found", "NOT_FOUND", 404, true);
  }
  if (!user.verified) {
    throw new GlobalError(
      "Email verification is required before withdrawing",
      "EMAIL_NOT_VERIFIED",
      403,
      true
    );
  }
  if (!user.userKYC?.isVerified) {
    throw new GlobalError(
      "Identity KYC verification is required before withdrawing",
      "KYC_REQUIRED",
      403,
      true
    );
  }

  const bank = await prisma.bankAccountDetail.findUnique({ where: { userId } });
  return { user, bank };
}

async function cancelStaleOtpPending(userId: number) {
  await prisma.withdrawal.updateMany({
    where: { userId, status: "OTP_PENDING" },
    data: {
      status: "CANCELLED",
      otp: null,
      otpCreatedAt: null,
      failureReason: "Superseded by a new withdrawal request",
    },
  });
}

async function debitWallet(
  tx: Prisma.TransactionClient,
  userId: number,
  currency: WithdrawCurrency,
  amount: number,
  withdrawalId: number
) {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new GlobalError("User not found", "NOT_FOUND", 404, true);
  }

  const balance =
    currency === "USD"
      ? toNumber(user.walletBalanceUSD)
      : toNumber(user.walletBalanceNGN);

  if (balance < amount) {
    throw new GlobalError(
      "Insufficient wallet balance",
      "INSUFFICIENT_BALANCE",
      409,
      true
    );
  }

  await tx.user.update({
    where: { id: userId },
    data:
      currency === "USD"
        ? { walletBalanceUSD: { decrement: amount } }
        : { walletBalanceNGN: { decrement: amount } },
  });

  await tx.walletTransaction.create({
    data: {
      userId,
      amount,
      type: "OUTFLOW",
      currency,
      description: `Withdrawal #${withdrawalId}`,
    },
  });
}

async function creditWallet(
  tx: Prisma.TransactionClient,
  userId: number,
  currency: WithdrawCurrency,
  amount: number,
  withdrawalId: number,
  reason: string
) {
  await tx.user.update({
    where: { id: userId },
    data:
      currency === "USD"
        ? { walletBalanceUSD: { increment: amount } }
        : { walletBalanceNGN: { increment: amount } },
  });

  await tx.walletTransaction.create({
    data: {
      userId,
      amount,
      type: "INFLOW",
      currency,
      description: `Withdrawal #${withdrawalId} refund: ${reason}`,
    },
  });
}

/** Mark PENDING earnings as WITHDRAWN FIFO until amount is covered. */
async function markEarningsWithdrawn(
  tx: Prisma.TransactionClient,
  userId: number,
  amount: number
) {
  const earnings = await tx.earnings.findMany({
    where: { userId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  let remaining = amount;
  for (const earning of earnings) {
    if (remaining <= 0) break;
    const earningAmount = toNumber(earning.amount);
    await tx.earnings.update({
      where: { id: earning.id },
      data: { status: "WITHDRAWN" },
    });
    remaining -= earningAmount;
  }
}

export async function requestWithdrawalService(
  userId: number,
  rawAmount: number,
  currency: WithdrawCurrency
) {
  const min = MIN_WITHDRAWAL[currency];
  if (!Number.isFinite(rawAmount) || rawAmount < min) {
    throw new GlobalError(
      `Minimum withdrawal is ${min} ${currency}`,
      "BELOW_MINIMUM",
      400,
      true
    );
  }

  const amount = Math.round(rawAmount * 100) / 100;

  const { user, bank } = await assertWithdrawEligible(userId);

  if (currency === "NGN" && !bank) {
    throw new GlobalError(
      "Add and verify a Nigerian bank account before withdrawing NGN",
      "BANK_REQUIRED",
      409,
      true
    );
  }

  const balance =
    currency === "USD"
      ? toNumber(user.walletBalanceUSD)
      : toNumber(user.walletBalanceNGN);

  if (balance < amount) {
    throw new GlobalError(
      "Insufficient wallet balance",
      "INSUFFICIENT_BALANCE",
      409,
      true
    );
  }

  const inFlight = await prisma.withdrawal.findFirst({
    where: {
      userId,
      status: { in: [...ACTIVE_WITHDRAWAL_STATUSES] },
    },
  });
  if (inFlight && inFlight.status !== "OTP_PENDING") {
    throw new GlobalError(
      "You already have a withdrawal in progress",
      "WITHDRAWAL_IN_PROGRESS",
      409,
      true
    );
  }

  await cancelStaleOtpPending(userId);

  const otp = generateSixDigitString();
  const reference = generateReference(userId);

  const withdrawal = await prisma.withdrawal.create({
    data: {
      userId,
      amount,
      currency,
      status: "OTP_PENDING",
      reference,
      bankAccountId: currency === "NGN" ? bank!.id : null,
      accountBank: currency === "NGN" ? bank!.bankCode : null,
      accountNumber: currency === "NGN" ? bank!.accountNumber : null,
      accountName: currency === "NGN" ? bank!.accountName : null,
      otp,
      otpCreatedAt: new Date(),
    },
  });

  const emailResult = await sendEmail(user.email, EmailType.WITHDRAWAL_OTP, {
    otp,
    amount,
    currency,
  });

  if (!emailResult.success) {
    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: "CANCELLED",
        otp: null,
        otpCreatedAt: null,
        failureReason: "OTP email delivery failed",
      },
    });
    throw new GlobalError(
      "Unable to send withdrawal OTP. Please try again",
      "EmailDeliveryError",
      502,
      true
    );
  }

  return {
    withdrawalId: withdrawal.id,
    reference: withdrawal.reference,
    amount: toNumber(withdrawal.amount),
    currency: withdrawal.currency,
    status: withdrawal.status,
    message: "An OTP has been sent to your registered email address",
  };
}

export async function confirmWithdrawalService(
  userId: number,
  withdrawalId: number,
  otp: string
) {
  const withdrawal = await prisma.withdrawal.findFirst({
    where: { id: withdrawalId, userId },
  });

  if (!withdrawal) {
    throw new GlobalError("Withdrawal not found", "NOT_FOUND", 404, true);
  }
  if (withdrawal.status !== "OTP_PENDING") {
    throw new GlobalError(
      "This withdrawal is not awaiting OTP confirmation",
      "INVALID_STATUS",
      409,
      true
    );
  }
  if (!withdrawal.otp || !withdrawal.otpCreatedAt) {
    throw new GlobalError(
      "No active OTP for this withdrawal",
      "OTP_MISSING",
      400,
      true
    );
  }
  if (Date.now() - withdrawal.otpCreatedAt.getTime() > WITHDRAWAL_OTP_EXPIRY_MS) {
    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: "CANCELLED",
        otp: null,
        otpCreatedAt: null,
        failureReason: "OTP expired",
      },
    });
    throw new GlobalError(
      "The OTP has expired. Please request a new withdrawal",
      "ExpiredOTP",
      400,
      true
    );
  }
  if (withdrawal.otp !== otp) {
    throw new GlobalError("The OTP provided is incorrect", "InvalidOTP", 400, true);
  }

  const amount = toNumber(withdrawal.amount);
  const currency = withdrawal.currency as WithdrawCurrency;

  // Debit first (atomic), then payout
  const debited = await prisma.$transaction(async (tx) => {
    const locked = await tx.withdrawal.findFirst({
      where: { id: withdrawal.id, userId, status: "OTP_PENDING", otp },
    });
    if (!locked) {
      throw new GlobalError(
        "Withdrawal already processed or OTP invalid",
        "INVALID_STATUS",
        409,
        true
      );
    }

    await debitWallet(tx, userId, currency, amount, withdrawal.id);

    if (currency === "USD") {
      return tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "PENDING_MANUAL",
          otp: null,
          otpCreatedAt: null,
          processedAt: new Date(),
        },
      });
    }

    return tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: "PROCESSING",
        otp: null,
        otpCreatedAt: null,
        processedAt: new Date(),
      },
    });
  });

  if (currency === "USD") {
    return {
      ...debited,
      amount: toNumber(debited.amount),
      message:
        "USD withdrawal received and queued for manual payout. Funds have been reserved from your wallet.",
    };
  }

  try {
    const transfer = await flutterwaveInitiateTransfer({
      accountBank: withdrawal.accountBank!,
      accountNumber: withdrawal.accountNumber!,
      amount,
      currency: "NGN",
      reference: withdrawal.reference,
      narration: `Mimotar withdrawal ${withdrawal.reference}`,
      callbackUrl: env.FLW_WEBHOOK_URL || undefined,
    });

    const updated = await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        providerTransferId: String(transfer.id),
        status:
          String(transfer.status).toLowerCase() === "successful"
            ? "COMPLETED"
            : "PROCESSING",
        completedAt:
          String(transfer.status).toLowerCase() === "successful"
            ? new Date()
            : null,
      },
    });

    if (updated.status === "COMPLETED") {
      await prisma.$transaction(async (tx) => {
        await markEarningsWithdrawn(tx, userId, amount);
      });
    }

    return {
      ...updated,
      amount: toNumber(updated.amount),
      message:
        updated.status === "COMPLETED"
          ? "Withdrawal completed successfully"
          : "Withdrawal submitted to Flutterwave and is processing",
    };
  } catch (error) {
    const reason =
      error instanceof GlobalError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Transfer failed";

    await prisma.$transaction(async (tx) => {
      await creditWallet(tx, userId, "NGN", amount, withdrawal.id, reason);
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: "FAILED",
          failureReason: reason,
          completedAt: new Date(),
        },
      });
    });

    throw new GlobalError(
      `Withdrawal failed and funds were returned to your wallet: ${reason}`,
      "WITHDRAWAL_FAILED",
      502,
      true
    );
  }
}

export async function handleTransferWebhookService(payload: any) {
  const data = payload?.data ?? payload;
  const reference = String(data?.reference || "");
  if (!reference) return { ignored: true };

  const withdrawal = await prisma.withdrawal.findUnique({
    where: { reference },
  });
  if (!withdrawal) return { ignored: true };
  if (withdrawal.status === "COMPLETED" || withdrawal.status === "FAILED") {
    return { ignored: true, reason: "already_final" };
  }
  if (withdrawal.status !== "PROCESSING") {
    return { ignored: true, reason: "not_processing" };
  }

  const status = String(data?.status || "").toLowerCase();
  const amount = toNumber(withdrawal.amount);

  if (["successful", "success"].includes(status)) {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawal.updateMany({
        where: { id: withdrawal.id, status: "PROCESSING" },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          providerTransferId: data?.id ? String(data.id) : withdrawal.providerTransferId,
        },
      });
      if (updated.count === 1) {
        await markEarningsWithdrawn(tx, withdrawal.userId, amount);
      }
    });
    return { ok: true, status: "COMPLETED" };
  }

  if (["failed", "reversed"].includes(status)) {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.withdrawal.updateMany({
        where: { id: withdrawal.id, status: "PROCESSING" },
        data: {
          status: "FAILED",
          failureReason: data?.complete_message || data?.status || "Transfer failed",
          completedAt: new Date(),
        },
      });
      if (updated.count === 1) {
        await creditWallet(
          tx,
          withdrawal.userId,
          withdrawal.currency as WithdrawCurrency,
          amount,
          withdrawal.id,
          "Flutterwave transfer failed"
        );
      }
    });
    return { ok: true, status: "FAILED" };
  }

  return { ignored: true, reason: "unhandled_status", status };
}

export async function listMyWithdrawalsService(userId: number) {
  const rows = await prisma.withdrawal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((w) => ({
    ...w,
    amount: toNumber(w.amount),
    otp: undefined,
  }));
}

export async function adminCompleteManualWithdrawalService(
  withdrawalId: number,
  note?: string
) {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
  });
  if (!withdrawal) {
    throw new GlobalError("Withdrawal not found", "NOT_FOUND", 404, true);
  }
  if (withdrawal.status !== "PENDING_MANUAL") {
    throw new GlobalError(
      "Only PENDING_MANUAL withdrawals can be completed by admin",
      "INVALID_STATUS",
      409,
      true
    );
  }

  const amount = toNumber(withdrawal.amount);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.withdrawal.updateMany({
      where: { id: withdrawalId, status: "PENDING_MANUAL" },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        failureReason: note || null,
      },
    });
    if (updated.count !== 1) {
      throw new GlobalError("Withdrawal already processed", "INVALID_STATUS", 409, true);
    }
    await markEarningsWithdrawn(tx, withdrawal.userId, amount);
  });

  return prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
}

export async function adminFailManualWithdrawalService(
  withdrawalId: number,
  reason: string
) {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
  });
  if (!withdrawal) {
    throw new GlobalError("Withdrawal not found", "NOT_FOUND", 404, true);
  }
  if (withdrawal.status !== "PENDING_MANUAL") {
    throw new GlobalError(
      "Only PENDING_MANUAL withdrawals can be failed by admin",
      "INVALID_STATUS",
      409,
      true
    );
  }

  const amount = toNumber(withdrawal.amount);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.withdrawal.updateMany({
      where: { id: withdrawalId, status: "PENDING_MANUAL" },
      data: {
        status: "FAILED",
        failureReason: reason,
        completedAt: new Date(),
      },
    });
    if (updated.count !== 1) {
      throw new GlobalError("Withdrawal already processed", "INVALID_STATUS", 409, true);
    }
    await creditWallet(
      tx,
      withdrawal.userId,
      withdrawal.currency as WithdrawCurrency,
      amount,
      withdrawal.id,
      reason
    );
  });

  return prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
}

export async function listPendingManualWithdrawalsService() {
  const rows = await prisma.withdrawal.findMany({
    where: { status: "PENDING_MANUAL" },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });
  return rows.map((w) => ({ ...w, amount: toNumber(w.amount), otp: undefined }));
}
