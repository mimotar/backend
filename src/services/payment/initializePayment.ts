import axios from "axios";
import { env } from "../../config/env";
import { GlobalError } from "../../middlewares/error/GlobalErrorHandler";
import { prisma } from "../../config/db";
import { CurrencyEnum } from "../../types/payment";
import { generateTransactionReference } from "../../utils/payment/generateTransactionReference";
import { calculateEscrowPayment, EscrowFeePayer } from "../../utils/payment/calculateAmountToPay";
import { checkAndExpireAllTransactionService } from "../ticket.service";


interface FlutterwaveCustomer {
  email: string;
  name: string;
  phone_number?: string;
}

interface FlutterwaveCustomizations {
  title: string;
  description: string;
  logo: string;
}

interface FlutterwaveInitPayload {
  transaction_id: number;
}

interface FlutterwaveResponse {
  status: "success" | "error";
  message?: string;
  data?: {
    link: string;
    payment_type?: string;
    [key: string]: any;
  };
}

const FLW_CONFIG = {
  baseUrl: env.FLW_BASE_URL,
  headers: {
    Authorization: `Bearer ${env.FLW_API_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
};

export class PaymentInitializationError extends GlobalError {
  details?: any;

  constructor(message: string, details?: any) {
    super(message, "PAYMENT_INITIALIZATION_FAILED", 400, false);
    this.details = details;
  }
}

const validateTransaction = async (transactionId: number) => {
  if (!transactionId) {
    throw new GlobalError(
      "Transaction ID is required",
      "BAD_REQUEST",
      400,
      false
    );
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  await checkAndExpireAllTransactionService(transactionId);

  if (transaction?.status === "EXPIRED") {
    throw new GlobalError(
      "Transaction has expired",
      "EXPIRED_TRANSACTION",
      400,
      false
    );
  }

  if (!transaction) {
    throw new GlobalError("Transaction not found", "NOT_FOUND", 404, false);
  }

  if (transaction.status === "ONGOING") {
    throw new GlobalError(
      "This payment has already been made",
      "ALREADY_PAID",
      400,
      false
    );
  }

  if (transaction.status !== "APPROVED") {
    throw new GlobalError(
      "Transaction is not in a valid state for payment",
      "INVALID_TRANSACTION_STATE",
      400,
      false
    );
  }

  return transaction;
};

export const initializeFlutterwavePaymentService = async (
  payload: FlutterwaveInitPayload
): Promise<FlutterwaveResponse> => {
  try {
    const { transaction_id } = payload;

    const transaction = await validateTransaction(transaction_id);
    const initial_amount = transaction.amount;
    const who_pays = transaction.pay_escrow_fee
    const { buyerTotalPayment } = calculateEscrowPayment(initial_amount, who_pays as EscrowFeePayer);
    const transaction_reference = generateTransactionReference();
    const currency = transaction.currency || "NGN";
    const description =
      transaction.transaction_description || "Payment for transaction";
    const logo = "https://example.com/logo.png";

    const user =
      transaction.reciever_role === "BUYER"
        ? {
            email: transaction.reciever_email,
            name: transaction.receiver_fullname,
            address: transaction.receiver_address,
          }
        : {
            email: transaction.creator_email,
            name: transaction.creator_fullname,
            address: transaction.creator_address,
          };

    const requestPayload = {
      amount: buyerTotalPayment,
      currency: currency as any,
      tx_ref: transaction_reference,
      redirect_url: `https://4808-102-89-42-219.ngrok-free.app/payment/success`,
      customer: {
        email: user.email,
        name: user.name,
      },
      meta: {
        transaction_id: transaction.id,
        description: transaction.transaction_description,
      },
      customizations: {
        description,
        logo,
      },
    };

    const response = await axios.post<FlutterwaveResponse>(
      `${FLW_CONFIG.baseUrl}/payments`,
      requestPayload,
      { headers: FLW_CONFIG.headers }
    );

    if (
      response.status !== 200 ||
      response.data.status !== "success" ||
      !response.data.data?.link
    ) {
      throw new PaymentInitializationError("Failed to initialize payment", {
        status: response.status,
        response: response.data,
      });
    }

    
    // await prisma.$transaction([
    //   prisma.payment.create({
    //     data: {
    //       amount: totalAmountToPay,
    //       transaction_reference,
    //       title: description,
    //       transaction_id,
    //     },
    //   }),
      
    // ]);

    return response.data;
  } catch (error) {
    if (error instanceof GlobalError) {
      throw error;
    }

    const errorMessage = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : error instanceof Error
      ? error.message
      : "Unknown payment initialization error";

    throw new PaymentInitializationError(errorMessage, {
      originalError: error,
    });
  }
};
