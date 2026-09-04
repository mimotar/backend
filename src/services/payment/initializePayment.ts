import axios from "axios";
import { env } from "../../config/env.js";
import { GlobalError } from "../../middlewares/error/GlobalErrorHandler.js";
import { prisma } from "../../config/db.js";
import { generateTransactionReference } from "../../utils/payment/generateTransactionReference.js";
import { calculateEscrowPayment, EscrowFeePayer } from "../../utils/payment/calculateAmountToPay.js";
import { checkAndExpireAllTransactionService } from "../ticket.service.js";
import { PaymentStatus } from "../../generated/prisma/enums.js";


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

function flutterwaveBaseUrl() {
  return (env.FLW_BASE_URL || "https://api.flutterwave.com/v3").replace(
    /\/$/,
    ""
  );
}

function flutterwaveSecretKey() {
  return (env.FLW_API_SECRET_KEY || "").trim().replace(/^["']|["']$/g, "");
}

function flutterwaveAuthHeaders() {
  const secret = flutterwaveSecretKey();
  if (!secret) {
    throw new PaymentInitializationError(
      "Flutterwave secret key is missing. Set FLW_API_SECRET in .env to the Secret Key from the Flutterwave dashboard (FLWSECK_TEST_... or FLWSECK_LIVE_...), not the public key.",
      503
    );
  }
  if (secret.startsWith("FLWPUBK_")) {
    throw new PaymentInitializationError(
      "FLW_API_SECRET is a public key. Use the Secret Key (FLWSECK_...) from the Flutterwave dashboard.",
      503
    );
  }
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
}

export class PaymentInitializationError extends GlobalError {
  details?: unknown;

  constructor(message: string, statusCode = 502, details?: unknown) {
    super("PAYMENT_INITIALIZATION_FAILED", message, statusCode, true);
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

  await checkAndExpireAllTransactionService(transactionId);

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { payment: true },
  });

  if (!transaction) {
    throw new GlobalError("Transaction not found", "NOT_FOUND", 404, false);
  }

  if (transaction.status === "EXPIRED") {
    throw new GlobalError(
      "Transaction has expired",
      "EXPIRED_TRANSACTION",
      400,
      false
    );
  }

  if (
    transaction.status === "ONGOING" ||
    transaction.payment?.status === PaymentStatus.COMPLETED
  ) {
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
    const headers = flutterwaveAuthHeaders();
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
      transaction.reciever_role === "CLIENT"
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
      redirect_url: `${process.env.FRONTEND_URL}/payment/success`,
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
      `${flutterwaveBaseUrl()}/payments`,
      requestPayload,
      { headers }
    );

    if (
      response.status !== 200 ||
      response.data.status !== "success" ||
      !response.data.data?.link
    ) {
      throw new PaymentInitializationError(
        response.data?.message || "Flutterwave did not return a payment link",
        502,
        { status: response.status, response: response.data }
      );
    }

    await upsertPendingPayment({
      transaction_id,
      transaction_reference,
      amount: Math.round(buyerTotalPayment),
      title: description,
    });

    return response.data;
  } catch (error) {
    if (error instanceof GlobalError) {
      throw error;
    }

    const axiosResponse = axios.isAxiosError?.(error)
      ? error.response
      : (error as { response?: { status?: number; data?: { message?: string } } })
          ?.response;
    const providerMessage = axiosResponse?.data?.message;

    if (axiosResponse?.status === 401) {
      throw new PaymentInitializationError(
        "Flutterwave rejected the API secret (Invalid authorization key). Set FLW_API_SECRET in .env to the current Secret Key from the Flutterwave dashboard (FLWSECK_...), not the public key.",
        502,
        { status: 401 }
      );
    }

    const errorMessage =
      providerMessage ||
      (error instanceof Error ? error.message : "Unknown payment initialization error");

    throw new PaymentInitializationError(errorMessage, 502, {
      status: axiosResponse?.status,
    });
  }
};

async function upsertPendingPayment(data: {
  transaction_id: number;
  transaction_reference: string;
  amount: number;
  title: string;
}) {
  const existing = await prisma.payment.findUnique({
    where: { transaction_id: data.transaction_id },
  });

  if (existing?.status === PaymentStatus.COMPLETED) {
    throw new GlobalError(
      "This payment has already been made",
      "ALREADY_PAID",
      400,
      false
    );
  }

  if (existing) {
    return prisma.payment.update({
      where: { transaction_id: data.transaction_id },
      data: {
        transaction_reference: data.transaction_reference,
        amount: data.amount,
        title: data.title,
        status: PaymentStatus.PENDING,
      },
    });
  }

  return prisma.payment.create({
    data: {
      transaction_id: data.transaction_id,
      transaction_reference: data.transaction_reference,
      amount: data.amount,
      title: data.title,
      status: PaymentStatus.PENDING,
    },
  });
}
