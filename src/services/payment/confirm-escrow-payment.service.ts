import axios from "axios";
import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { GlobalError } from "../../middlewares/error/GlobalErrorHandler.js";
import { PaymentStatus } from "../../generated/prisma/enums.js";
import { sendEmailWithTemplate } from "../emailService.js";
import { getTransactionParticipants } from "../../utils/payment/getTransactionParticipants.js";
import { mapFlutterwavePaymentTypeToEnum } from "../../controllers/payment/normalizepaymentType.js";
import {
  calculateEscrowPayment,
  EscrowFeePayer,
} from "../../utils/payment/calculateAmountToPay.js";
import { activateTransactionAfterPayment } from "./activate-after-payment.service.js";

const AMOUNT_TOLERANCE = 1;

export type ConfirmEscrowPaymentInput = {
  flwTransactionId?: string | number;
  txRef?: string;
  webhookPayload?: Record<string, any>;
  mimotarTransactionId?: number;
};

export type ConfirmEscrowPaymentResult = {
  outcome: "activated" | "already_processed" | "not_successful";
  message: string;
  transactionId?: number;
};

function flutterwaveBaseUrl() {
  return (env.FLW_BASE_URL || "https://api.flutterwave.com/v3").replace(
    /\/$/,
    ""
  );
}

function logConfirm(
  level: "info" | "warn" | "error",
  reason: string,
  extra: Record<string, unknown> = {}
) {
  const payload = { reason, ...extra };
  if (level === "error") {
    console.error("[payment.confirm]", payload);
  } else if (level === "warn") {
    console.warn("[payment.confirm]", payload);
  } else {
    console.info("[payment.confirm]", payload);
  }
}

function parseTransactionId(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function flwHeaders() {
  return {
    Authorization: `Bearer ${env.FLW_API_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

async function verifyFlutterwaveCharge(input: ConfirmEscrowPaymentInput) {
  const base = flutterwaveBaseUrl();
  const flwTransactionId =
    input.flwTransactionId ??
    input.webhookPayload?.id ??
    input.webhookPayload?.data?.id;
  const txRef = input.txRef ?? input.webhookPayload?.data?.tx_ref;

  try {
    if (flwTransactionId) {
      const verification = await axios.get(
        `${base}/transactions/${flwTransactionId}/verify`,
        { headers: flwHeaders() }
      );
      return verification.data;
    }

    if (txRef) {
      const verification = await axios.get(
        `${base}/transactions/verify_by_reference`,
        {
          headers: flwHeaders(),
          params: { tx_ref: txRef },
        }
      );
      return verification.data;
    }
  } catch (error) {
    logConfirm("error", "verify_failed", {
      flwTransactionId,
      txRef,
      message: axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : error instanceof Error
          ? error.message
          : "unknown",
    });
    throw new GlobalError(
      "FLUTTERWAVE_VERIFY_FAILED",
      "Flutterwave verification failed",
      400,
      true
    );
  }

  logConfirm("error", "missing_flw_id", { mimotarTransactionId: input.mimotarTransactionId });
  throw new GlobalError(
    "MISSING_FLW_ID",
    "Missing Flutterwave transaction id or tx_ref",
    400,
    true
  );
}

async function resolveMimotarTransactionId(
  input: ConfirmEscrowPaymentInput,
  verifiedData: Record<string, any>
): Promise<number> {
  if (input.mimotarTransactionId) {
    return input.mimotarTransactionId;
  }

  const txRef = verifiedData.tx_ref || input.txRef;
  if (txRef) {
    const payment = await prisma.payment.findUnique({
      where: { transaction_reference: String(txRef) },
    });
    if (payment) {
      return payment.transaction_id;
    }
  }

  const fromMeta = parseTransactionId(
    verifiedData.meta?.transaction_id ??
      input.webhookPayload?.data?.meta?.transaction_id ??
      input.webhookPayload?.meta?.transaction_id
  );
  if (fromMeta) {
    return fromMeta;
  }

  logConfirm("error", "invalid_transaction_id", {
    txRef,
    meta: verifiedData.meta,
  });
  throw new GlobalError(
    "INVALID_TRANSACTION_ID",
    "Invalid transaction id in payment meta",
    400,
    true
  );
}

async function notifySellerOfFunding(
  transactionId: number,
  transaction: { transaction_description: string | null },
  verifiedData: Record<string, any>,
  paidAmount: number,
  buyerTotalPayment: number
) {
  try {
    const participants = await getTransactionParticipants(transactionId);
    await sendEmailWithTemplate(
      participants.seller.email,
      {
        buyer: participants.buyer.fullname,
        buyer_email: participants.buyer.email,
        seller: participants.seller.fullname,
        description:
          verifiedData?.meta?.description || transaction.transaction_description,
        amount: paidAmount || buyerTotalPayment,
        transaction_id: transactionId,
      },
      9
    );
  } catch (error) {
    logConfirm("error", "email_failed", {
      transactionId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

/**
 * Verifies a Flutterwave charge and moves the Mimotar transaction to ONGOING.
 * Shared by webhook, verify-on-success, and admin reconcile.
 */
export async function confirmEscrowPayment(
  input: ConfirmEscrowPaymentInput
): Promise<ConfirmEscrowPaymentResult> {
  logConfirm("info", "verifying", {
    flwTransactionId: input.flwTransactionId,
    txRef: input.txRef,
    mimotarTransactionId: input.mimotarTransactionId,
  });

  const verification = await verifyFlutterwaveCharge(input);

  if (verification?.status !== "success") {
    logConfirm("error", "verify_failed", {
      flwStatus: verification?.status,
    });
    throw new GlobalError(
      "FLUTTERWAVE_VERIFY_FAILED",
      "Flutterwave verification failed",
      400,
      true
    );
  }

  const data = verification.data;
  if (!data || data.status !== "successful") {
    logConfirm("warn", "not_successful", {
      flwPaymentStatus: data?.status,
      txRef: data?.tx_ref,
    });
    return {
      outcome: "not_successful",
      message: "Payment not successful; transaction left unchanged",
    };
  }

  const transactionId = await resolveMimotarTransactionId(input, data);

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { payment: true },
  });

  if (!transaction) {
    logConfirm("error", "not_found", { transactionId });
    throw new GlobalError(
      "NOT_FOUND",
      "Transaction not found",
      404,
      true
    );
  }

  if (
    transaction.status === "ONGOING" &&
    transaction.payment?.status === PaymentStatus.COMPLETED
  ) {
    logConfirm("info", "already_processed", { transactionId });
    return {
      outcome: "already_processed",
      message: "Payment already processed",
      transactionId,
    };
  }

  const existingByRef = data.tx_ref
    ? await prisma.payment.findUnique({
        where: { transaction_reference: data.tx_ref },
      })
    : null;

  if (
    existingByRef &&
    existingByRef.transaction_id !== transactionId
  ) {
    logConfirm("error", "duplicate_tx_ref", {
      txRef: data.tx_ref,
      existingTransactionId: existingByRef.transaction_id,
      transactionId,
    });
    throw new GlobalError(
      "DUPLICATE_PAYMENT_REFERENCE",
      "Payment reference already recorded for another transaction",
      409,
      true
    );
  }

  if (
    existingByRef?.status === PaymentStatus.COMPLETED &&
    transaction.status === "ONGOING"
  ) {
    logConfirm("info", "already_processed", {
      transactionId,
      txRef: data.tx_ref,
    });
    return {
      outcome: "already_processed",
      message: "Payment reference already recorded",
      transactionId,
    };
  }

  const fundable =
    transaction.status === "APPROVED" || transaction.status === "EXPIRED";
  if (!fundable && transaction.status !== "ONGOING") {
    logConfirm("error", "invalid_status", {
      transactionId,
      status: transaction.status,
    });
    throw new GlobalError(
      "INVALID_TRANSACTION_STATE",
      `Cannot fund a transaction in status ${transaction.status}`,
      409,
      true
    );
  }

  const { buyerTotalPayment } = calculateEscrowPayment(
    transaction.amount,
    transaction.pay_escrow_fee as EscrowFeePayer
  );
  const paidAmount = Number(data.amount);
  if (
    Number.isFinite(paidAmount) &&
    Math.abs(paidAmount - buyerTotalPayment) > AMOUNT_TOLERANCE
  ) {
    logConfirm("error", "amount_mismatch", {
      transactionId,
      expected: buyerTotalPayment,
      paid: paidAmount,
    });
    throw new GlobalError(
      "AMOUNT_MISMATCH",
      "Paid amount does not match expected escrow total",
      409,
      true
    );
  }

  if (
    data.currency &&
    transaction.currency &&
    String(data.currency).toUpperCase() !==
      String(transaction.currency).toUpperCase()
  ) {
    logConfirm("error", "currency_mismatch", {
      transactionId,
      expected: transaction.currency,
      paid: data.currency,
    });
    throw new GlobalError(
      "CURRENCY_MISMATCH",
      "Paid currency does not match transaction currency",
      409,
      true
    );
  }

  const paymentMethod = mapFlutterwavePaymentTypeToEnum(data?.payment_type);
  const paymentAmount = Math.round(paidAmount || buyerTotalPayment);
  const title =
    data?.meta?.description ||
    transaction.transaction_description ||
    "Payment for transaction";
  const existingPayment = transaction.payment || existingByRef;

  await prisma.$transaction(async (tx) => {
    if (existingPayment) {
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          payment_method: paymentMethod,
          transaction_reference: data.tx_ref || existingPayment.transaction_reference,
          amount: paymentAmount,
          title,
        },
      });
    } else {
      await tx.payment.create({
        data: {
          status: PaymentStatus.COMPLETED,
          payment_method: paymentMethod,
          transaction_reference: data.tx_ref,
          amount: paymentAmount,
          transaction_id: transactionId,
          title,
        },
      });
    }

    await activateTransactionAfterPayment(transactionId, tx);
  });

  logConfirm("info", "activated", {
    transactionId,
    txRef: data.tx_ref,
    previousStatus: transaction.status,
  });

  await notifySellerOfFunding(
    transactionId,
    transaction,
    data,
    paidAmount,
    buyerTotalPayment
  );

  return {
    outcome: "activated",
    message: "Webhook processed successfully",
    transactionId,
  };
}

/**
 * Confirm payment for a known Mimotar transaction (verify-on-success / reconcile).
 * Uses the stored PENDING tx_ref when the caller does not pass Flutterwave ids.
 */
export async function confirmEscrowPaymentForTransaction(
  mimotarTransactionId: number,
  body: { tx_ref?: string; transaction_id?: string | number } = {}
): Promise<ConfirmEscrowPaymentResult> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: mimotarTransactionId },
    include: { payment: true },
  });

  if (!transaction) {
    throw new GlobalError("NOT_FOUND", "Transaction not found", 404, true);
  }

  const txRef = body.tx_ref || transaction.payment?.transaction_reference;
  const flwTransactionId = body.transaction_id;

  if (!txRef && (flwTransactionId === undefined || flwTransactionId === "")) {
    throw new GlobalError(
      "BAD_REQUEST",
      "Missing tx_ref or Flutterwave transaction_id",
      400,
      true
    );
  }

  return confirmEscrowPayment({
    mimotarTransactionId,
    txRef,
    flwTransactionId,
  });
}
