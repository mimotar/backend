import { prisma } from "../../config/db";
import { initializeFlutterwavePaymentService } from "../../services/payment/initializePayment";
import { Request, Response } from "express";
import { env } from "../../config/env";
import { GlobalError } from "../../middlewares/error/GlobalErrorHandler";
import axios from "axios";
import { sendEmailWithTemplate } from "../../services/emailService";
import { getTransactionParticipants } from "../../utils/payment/getTransactionParticipants";
import { deleteAllTransactionService, deleteTransactionService } from "../../services/ticket.service";
import { mapFlutterwavePaymentTypeToEnum } from "./normalizepaymentType";
import { PaymentStatus } from "@prisma/client";

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

export const deleteTransactionController = async(req: Request, res:Response) => {
    try {
        const transactionId = req.params.id;
        const deleteTransaction = await deleteTransactionService(Number(transactionId));
        
        res.status(200).json({
            message: "Transaction deleted successfully",
            transaction: deleteTransaction
        });
    } catch (error) {
        new GlobalError("FAILED", "Could not delete transaction", 400, false);
        res.status(400).json({ message: "Could not delete transaction" });
        return;
    }
}



export const deleteAllTransactionController = async(req: Request, res:Response) => {
    try {
        const transactions = await deleteAllTransactionService();
        res.status(200).json({
            message: "All transactions deleted successfully",
            transactions: transactions
        }); 
    } catch (error) {
        new GlobalError("FAILED", "Could not delete transactions", 400, false);
        res.status(400).json({ message: "Could not delete transactions" });
        return;

    }}

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
  const baseUrl = env.FLW_BASE_URL;

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
          data: { status: "ONGOING" },
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
