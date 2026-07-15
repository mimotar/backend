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
import { PaymentStatus, Prisma } from "../../generated/prisma/client.js";
// import PaymentStatus from "@prisma/client";

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
    res
      .status(400)
      .json({
        message:
          "Transaction is not in a valid state for payment, ensure it is approved by counter party",
      });
    return;
  }
  try {
    // Validate required fields

    // Initialize payment
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

  const payload = req.body;
  const baseUrl = "https://api.flutterwave.com/v3/";

  const user = await getTransactionParticipants(payload.meta?.transaction_id);

  try {
    const verification = await axios.get(
      `${baseUrl}/transactions/${payload.id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${env.FLW_API_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // console.log("Verification response:", verification.data);

    
    // console.log("Payload received");
    const data = verification?.data?.data;
    if (verification.data.data.status === "successful") {
        console.log("Payment successful, processing transaction...");
        
        const payload = {
             status: PaymentStatus.COMPLETED,
                payment_method: mapFlutterwavePaymentTypeToEnum(data?.payment_type),
                transaction_reference: data?.tx_ref,
                amount: data?.amount,
                transaction_id: Number(data?.meta?.transaction_id),
                title: data?.meta?.description,
        }
        console.log("Payload to be saved:", payload);

      await prisma.$transaction([
       
        prisma.payment.create({
            data: payload
        }),
        prisma.transaction.update({
          where: { id: Number(data?.meta?.transaction_id) },
          data: {
            status: "ONGOING",
            payment_sent_to_escrow_at: new Date(),
            inspection_started_at: new Date(),
          },
        }),
      ]);

      //Send email to the seller on payment success

       sendEmailWithTemplate(
        user.seller.email,
        { buyer: user.buyer.fullname, buyer_email: user.buyer.email, seller: user.seller.fullname,
            description: data?.description, amount: data?.amount, transaction_id: data?.meta?.transaction_id },
         
        9
      );


     

    //   Send email to buyer 
     await sendEmailWithTemplate(
        user.seller.email,
        { sender: user.buyer.fullname, seller: user.buyer.fullname },
        9
      );
     
    //   console.log("Webhook processed successfully")
      res.status(200).json({
        success: true,
        message: "Webhook processed successfully"
      })
    }
  } catch (error) {
    new GlobalError("FAILED", "Could not run webhook", 400, false);
  }
};
