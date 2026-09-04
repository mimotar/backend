import { prisma } from "../../config/db.js";
import { initializeFlutterwavePaymentService } from "../../services/payment/initializePayment.js";
import { Request, Response } from "express";
import { env } from "../../config/env.js";
import { GlobalError } from "../../middlewares/error/GlobalErrorHandler.js";
import { deleteTransactionService } from "../../services/transaction-deletion.service.js";
import {
  confirmEscrowPayment,
  confirmEscrowPaymentForTransaction,
} from "../../services/payment/confirm-escrow-payment.service.js";

export const initiatePaymentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const transactionId = req.params.id;

  const transaction = await prisma.transaction.findUnique({
    where: {
      id: Number(transactionId),
    },
  });

  if (!transaction) {
    res.status(404).json({ message: "Transaction not found" });
    return;
  }

  if (transaction.status !== "APPROVED") {
    res.status(400).json({
      message:
        "Transaction is not in a valid state for payment, ensure it is approved by counter party",
    });
    return;
  }
  try {
    const paymentResponse = await initializeFlutterwavePaymentService({
      transaction_id: Number(transactionId),
    });

    if (paymentResponse && paymentResponse.data && paymentResponse.data.link) {
      await res.json(paymentResponse);
      return;
    } else {
      res.status(500).json({ message: "Payment link not found in response" });
      return;
    }
  } catch (error) {
    console.error("Error initiating payment:", error);
    res.status(500).json({ message: "Internal server error" });
    return;
  }
};

export const deleteTransactionController = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { id: number })?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const transactionId = Number(req.params.id);
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      return res.status(400).json({ message: "Transaction ID must be a positive integer" });
    }

    const deletedTransaction = await deleteTransactionService(
      transactionId,
      userId
    );

    return res.status(200).json({
      message: "Transaction deleted successfully",
      transaction: deletedTransaction,
    });
  } catch (error) {
    if (error instanceof GlobalError) {
      return res.status(error.statusCode).json({
        name: error.name,
        message: error.message,
      });
    }
    console.error("Transaction deletion error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const PaymentWebhookController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const signature = req.headers["verif-hash"];
  if (signature !== env.FLW_WEBHOOK_SECRET) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const webhookPayload = req.body;
  const event = String(webhookPayload?.event || "").toLowerCase();
  const reference = String(webhookPayload?.data?.reference || "");

  // Transfer webhooks share the same Flutterwave endpoint/secret.
  if (event.includes("transfer") || reference.startsWith("wd_")) {
    try {
      const { handleTransferWebhookService } = await import(
        "../../services/withdrawal/withdrawal-flow.service.js"
      );
      const result = await handleTransferWebhookService(webhookPayload);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error("Transfer webhook via payment endpoint failed:", error);
      res.status(500).json({ message: "Transfer webhook failed" });
    }
    return;
  }

  try {
    const result = await confirmEscrowPayment({
      flwTransactionId: webhookPayload?.id ?? webhookPayload?.data?.id,
      txRef: webhookPayload?.data?.tx_ref,
      webhookPayload,
    });

    if (result.outcome === "not_successful") {
      res.status(200).json({
        success: false,
        message: result.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Payment webhook error:", error);
    if (error instanceof GlobalError) {
      res.status(error.statusCode).json({ message: error.message, name: error.name });
      return;
    }
    res.status(500).json({ message: "Could not process webhook" });
  }
};

type AuthUser = {
  id?: number;
  userId?: number;
  email?: string;
};

function parsePositiveInt(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function isTransactionParticipant(
  transaction: {
    user_id: number | null;
    creator_email: string;
    reciever_email: string;
  },
  user: AuthUser | undefined
): boolean {
  const userId = user?.id ?? user?.userId;
  const email = user?.email?.toLowerCase();

  if (userId && transaction.user_id === userId) {
    return true;
  }

  if (!email) {
    return false;
  }

  return (
    transaction.creator_email.toLowerCase() === email ||
    transaction.reciever_email.toLowerCase() === email
  );
}

function paymentConfirmBody(req: Request) {
  return {
    tx_ref: req.body?.tx_ref as string | undefined,
    transaction_id: req.body?.transaction_id as string | number | undefined,
  };
}

async function handleConfirmForTransaction(req: Request, res: Response) {
  const transactionId = parsePositiveInt(req.params.id);
  if (!transactionId) {
    res.status(400).json({ message: "Transaction ID must be a positive integer" });
    return;
  }

  try {
    const result = await confirmEscrowPaymentForTransaction(
      transactionId,
      paymentConfirmBody(req)
    );

    if (result.outcome === "not_successful") {
      res.status(409).json({
        success: false,
        message: result.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: result.message,
      transactionId: result.transactionId,
    });
  } catch (error) {
    console.error("Payment confirm error:", error);
    if (error instanceof GlobalError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        name: error.name,
      });
      return;
    }
    res.status(500).json({ message: "Could not confirm payment" });
  }
}

/**
 * Called by the frontend /payment/success page after Flutterwave redirect.
 * Body may include `tx_ref` and/or Flutterwave `transaction_id` from the query string.
 * If omitted, the PENDING payment's stored tx_ref is used.
 */
export const verifyPaymentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const transactionId = parsePositiveInt(req.params.id);
  if (!transactionId) {
    res.status(400).json({ message: "Transaction ID must be a positive integer" });
    return;
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: {
      user_id: true,
      creator_email: true,
      reciever_email: true,
    },
  });

  if (!transaction) {
    res.status(404).json({ message: "Transaction not found", success: false });
    return;
  }

  if (!isTransactionParticipant(transaction, req.user as AuthUser | undefined)) {
    res.status(403).json({ message: "Forbidden", success: false });
    return;
  }

  await handleConfirmForTransaction(req, res);
};

/**
 * Ops recovery for a Flutterwave-successful charge that never reached ONGOING.
 */
export const reconcilePaymentController = async (
  req: Request,
  res: Response
): Promise<void> => {
  await handleConfirmForTransaction(req, res);
};
