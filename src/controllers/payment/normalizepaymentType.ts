import { PaymentMethod } from "@prisma/client";

export function mapFlutterwavePaymentTypeToEnum(type: string): PaymentMethod {
  const normalized = type.toLowerCase();

  if (normalized.includes("card")) return "ATM_CARD";
  if (normalized.includes("bank")) return "BANK_TRANSFER";
  if (normalized.includes("ussd")) return "USSD";
  if (normalized.includes("internet")) return "INTERNET_BANKING";
  if (normalized.includes("apple")) return "APPLE_PAY";
  if (normalized.includes("google")) return "GOOGLE_PAY";

  throw new Error(`Unsupported payment method from Flutterwave: ${type}`);
}
