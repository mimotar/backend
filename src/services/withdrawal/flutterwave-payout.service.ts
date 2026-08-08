import axios from "axios";
import { env } from "../../config/env.js";
import { GlobalError } from "../../middlewares/error/GlobalErrorHandler.js";

const flwHeaders = () => ({
  Authorization: `Bearer ${env.FLW_API_SECRET_KEY}`,
  "Content-Type": "application/json",
});

function baseUrl() {
  return (env.FLW_BASE_URL || "https://api.flutterwave.com/v3").replace(/\/$/, "");
}

export async function flutterwaveListBanks(country = "NG") {
  const response = await axios.get(`${baseUrl()}/banks/${country}`, {
    headers: flwHeaders(),
  });
  if (response.data?.status !== "success") {
    throw new GlobalError(
      response.data?.message || "Failed to fetch banks",
      "FLW_BANKS_FAILED",
      502,
      true
    );
  }
  return (response.data.data || []) as Array<{ id: number; code: string; name: string }>;
}

export async function flutterwaveResolveAccount(
  accountNumber: string,
  accountBank: string
) {
  const response = await axios.post(
    `${baseUrl()}/accounts/resolve`,
    { account_number: accountNumber, account_bank: accountBank },
    { headers: flwHeaders() }
  );

  if (response.data?.status !== "success" || !response.data?.data?.account_name) {
    throw new GlobalError(
      response.data?.message || "Unable to resolve bank account",
      "FLW_RESOLVE_FAILED",
      400,
      true
    );
  }

  return {
    accountNumber: String(response.data.data.account_number),
    accountName: String(response.data.data.account_name),
    bankCode: accountBank,
  };
}

export async function flutterwaveInitiateTransfer(input: {
  accountBank: string;
  accountNumber: string;
  amount: number;
  currency: "NGN";
  reference: string;
  narration: string;
  callbackUrl?: string;
}) {
  const response = await axios.post(
    `${baseUrl()}/transfers`,
    {
      account_bank: input.accountBank,
      account_number: input.accountNumber,
      amount: input.amount,
      narration: input.narration,
      currency: input.currency,
      reference: input.reference,
      debit_currency: input.currency,
      ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
    },
    { headers: flwHeaders() }
  );

  if (response.data?.status !== "success") {
    throw new GlobalError(
      response.data?.message || "Transfer initiation failed",
      "FLW_TRANSFER_FAILED",
      502,
      true
    );
  }

  return response.data.data as {
    id: number;
    status: string;
    reference: string;
    amount: number;
  };
}
