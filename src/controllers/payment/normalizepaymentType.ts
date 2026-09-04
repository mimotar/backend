import { PaymentMethod } from "../../generated/prisma/enums.js";

/**
 * Maps Flutterwave `payment_type` to our PaymentMethod enum.
 * Unknown or missing types default instead of throwing so a successful
 * charge cannot roll back ONGOING activation.
 */
export function mapFlutterwavePaymentTypeToEnum(
  type?: string | null
): PaymentMethod {
  if (!type || typeof type !== "string") {
    console.warn(
      "[payment.confirm] Missing Flutterwave payment_type; defaulting to ATM_CARD"
    );
    return "ATM_CARD";
  }

  const normalized = type.toLowerCase();

  if (normalized.includes("card")) return "ATM_CARD";
  if (
    normalized.includes("account") ||
    normalized.includes("bank") ||
    normalized.includes("transfer") ||
    normalized.includes("nqr") ||
    normalized.includes("qr")
  ) {
    return "BANK_TRANSFER";
  }
  if (normalized.includes("ussd")) return "USSD";
  if (normalized.includes("internet")) return "INTERNET_BANKING";
  if (normalized.includes("apple")) return "APPLE_PAY";
  if (normalized.includes("google")) return "GOOGLE_PAY";

  console.warn(
    `[payment.confirm] Unsupported Flutterwave payment_type "${type}"; defaulting to ATM_CARD`
  );
  return "ATM_CARD";
}
