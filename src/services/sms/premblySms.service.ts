import { premblyAxiosInstance } from "../../config/premblyConfig.js";

export interface SendSmsResult {
  success: boolean;
  message: string;
  providerResponse?: unknown;
  error?: string;
}

/**
 * Normalizes phone number into E.164-compatible or international format without leading zero.
 * e.g., "08012345678" -> "+2348012345678" (assuming NG default if 11 digits starting with 0)
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "").trim();

  // Nigerian local format starting with 0 (11 digits: 080..., 090..., 070...)
  if (/^0[789][01]\d{8}$/.test(cleaned)) {
    return `+234${cleaned.slice(1)}`;
  }

  // Already prefixed with +
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // 13 digits starting with 234
  if (/^234\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

/**
 * Masks a phone number for privacy display (e.g., "+2348012345678" -> "+234*****5678")
 */
export function maskPhoneNumber(phone: string): string {
  const cleaned = phone.trim();
  if (cleaned.length <= 6) return cleaned;
  const prefix = cleaned.slice(0, 4);
  const suffix = cleaned.slice(-4);
  return `${prefix}*****${suffix}`;
}

export class PremblySmsService {
  /**
   * Send an SMS message via Prembly.
   * If in development or test environment, or if Prembly sandbox/credentials return an error,
   * it provides a graceful fallback by logging to the console so local flows never break.
   */
  async sendSms(to: string, message: string): Promise<SendSmsResult> {
    const formattedPhone = normalizePhoneNumber(to);
    const smsEndpoint = process.env.PREMBLY_SMS_ENDPOINT || "/api/v1/sms/send";

    // In automated test environment, log and return success immediately
    if (process.env.NODE_ENV === "test") {
      console.log(`[Prembly SMS (Test)] To: ${formattedPhone} | Message: ${message}`);
      return {
        success: true,
        message: "SMS dispatched successfully (test mode)",
        providerResponse: { status: true, testMode: true },
      };
    }

    try {
      const response = await premblyAxiosInstance.post(smsEndpoint, {
        phone_number: formattedPhone,
        recipient: formattedPhone,
        to: formattedPhone,
        number: formattedPhone,
        message,
      });

      console.log(`[Prembly SMS] Successfully sent SMS to ${maskPhoneNumber(formattedPhone)}`);
      return {
        success: true,
        message: "SMS dispatched successfully",
        providerResponse: response.data,
      };
    } catch (error: any) {
      console.warn(
        `[Prembly SMS] Warning sending SMS to ${maskPhoneNumber(formattedPhone)} via ${smsEndpoint}:`,
        error?.response?.data || error?.message
      );

      // In non-production development environments, provide a fallback to unblock developer testing
      if (process.env.NODE_ENV !== "production") {
        console.info(
          `[Prembly SMS (Dev Fallback)] To: ${formattedPhone} | Code Message: "${message}"`
        );
        return {
          success: true,
          message: "SMS dispatched successfully (development fallback)",
          providerResponse: { fallback: true },
        };
      }

      return {
        success: false,
        message: error?.response?.data?.message || "Failed to dispatch SMS via Prembly",
        error: error?.message,
      };
    }
  }
}

export const premblySmsService = new PremblySmsService();
