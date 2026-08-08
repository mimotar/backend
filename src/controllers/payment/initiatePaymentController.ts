import { prisma } from "../../config/db.js";
import { initializeFlutterwavePaymentService } from "../../services/payment/initializePayment.js";
import { Request, Response } from "express";
import { env } from "../../config/env.js";
import { GlobalError } from "../../middlewares/error/GlobalErrorHandler.js";
import axios from "axios";
import { sendEmailWithTemplate } from "../../services/emailService.js";
import { getTransactionParticipants } from "../../utils/payment/getTransactionParticipants.js";
import { deleteTransactionService } from "../../services/transaction-deletion.service.js";
import { mapFlutterwavePaymentTypeToEnum } from "./normalizepaymentType.js";
import { PaymentStatus } from "../../generated/prisma/client.js";
import {
  calculateEscrowPayment,
  EscrowFeePayer,
} from "../../utils/payment/calculateAmountToPay.js";
import { activateTransactionAfterPayment } from "../../services/payment/activate-after-payment.service.js";

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

  const baseUrl = "https://api.flutterwave.com/v3/";

  try {
    const flwTransactionId = webhookPayload?.id ?? webhookPayload?.data?.id;
    if (!flwTransactionId) {
      res.status(400).json({ message: "Missing Flutterwave transaction id" });
      return;
    }

    const verification = await axios.get(
      `${baseUrl}/transactions/${flwTransactionId}/verify`,
      {
        headers: {
          Authorization: `Bearer ${env.FLW_API_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (verification.data?.status !== "success") {
      res.status(400).json({ message: "Flutterwave verification failed" });
      return;
    }

    const data = verification.data?.data;
    if (!data || data.status !== "successful") {
      res.status(200).json({
        success: false,
        message: "Payment not successful; transaction left unchanged",
      });
      return;
    }

    const transactionId = Number(
      data.meta?.transaction_id ?? webhookPayload?.meta?.transaction_id
    );
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      res.status(400).json({ message: "Invalid transaction id in payment meta" });
      return;
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { payment: true },
    });

    if (!transaction) {
      res.status(404).json({ message: "Transaction not found" });
      return;
    }

    // Idempotent: already funded
    if (transaction.status === "ONGOING" && transaction.payment) {
      res.status(200).json({
        success: true,
        message: "Payment already processed",
      });
      return;
    }

    if (transaction.status !== "APPROVED") {
      res.status(409).json({
        message: `Cannot fund a transaction in status ${transaction.status}`,
      });
      return;
    }

    const { buyerTotalPayment } = calculateEscrowPayment(
      transaction.amount,
      transaction.pay_escrow_fee as EscrowFeePayer
    );
    const paidAmount = Number(data.amount);
    if (Number.isFinite(paidAmount) && Math.abs(paidAmount - buyerTotalPayment) > 0.01) {
      res.status(409).json({
        message: "Paid amount does not match expected escrow total",
      });
      return;
    }

    if (
      data.currency &&
      transaction.currency &&
      String(data.currency).toUpperCase() !== String(transaction.currency).toUpperCase()
    ) {
      res.status(409).json({
        message: "Paid currency does not match transaction currency",
      });
      return;
    }

    const existingByRef = data.tx_ref
      ? await prisma.payment.findUnique({
          where: { transaction_reference: data.tx_ref },
        })
      : null;
    if (existingByRef) {
      res.status(200).json({
        success: true,
        message: "Payment reference already recorded",
      });
      return;
    }

    const participants = await getTransactionParticipants(transactionId);

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          status: PaymentStatus.COMPLETED,
          payment_method: mapFlutterwavePaymentTypeToEnum(data?.payment_type),
          transaction_reference: data.tx_ref,
          amount: Math.round(paidAmount || buyerTotalPayment),
          transaction_id: transactionId,
          title:
            data?.meta?.description ||
            transaction.transaction_description ||
            "Payment for transaction",
        },
      });

      await activateTransactionAfterPayment(transactionId, tx);
    });

    await sendEmailWithTemplate(
      participants.seller.email,
      {
        buyer: participants.buyer.fullname,
        buyer_email: participants.buyer.email,
        seller: participants.seller.fullname,
        description: data?.meta?.description || transaction.transaction_description,
        amount: paidAmount || buyerTotalPayment,
        transaction_id: transactionId,
      },
      9
    );

    res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
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
