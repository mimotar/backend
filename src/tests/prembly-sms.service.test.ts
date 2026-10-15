import {
  normalizePhoneNumber,
  maskPhoneNumber,
  PremblySmsService,
} from "../services/sms/premblySms.service.js";
import { premblyAxiosInstance } from "../config/premblyConfig.js";

jest.mock("../config/premblyConfig.js", () => ({
  __esModule: true,
  premblyAxiosInstance: {
    post: jest.fn(),
  },
}));

describe("Prembly SMS Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("normalizePhoneNumber", () => {
    it("formats 11-digit local Nigerian numbers starting with 0 into international +234 format", () => {
      expect(normalizePhoneNumber("08012345678")).toBe("+2348012345678");
      expect(normalizePhoneNumber("09098765432")).toBe("+2349098765432");
      expect(normalizePhoneNumber("07011223344")).toBe("+2347011223344");
    });

    it("preserves numbers already having + country code", () => {
      expect(normalizePhoneNumber("+2348012345678")).toBe("+2348012345678");
      expect(normalizePhoneNumber("+14155552671")).toBe("+14155552671");
      expect(normalizePhoneNumber("+447911123456")).toBe("+447911123456");
    });

    it("removes whitespace, dashes, and parentheses", () => {
      expect(normalizePhoneNumber("080 1234 5678")).toBe("+2348012345678");
      expect(normalizePhoneNumber("(080) 123-45678")).toBe("+2348012345678");
      expect(normalizePhoneNumber("+234 801-234-5678")).toBe("+2348012345678");
    });

    it("prefixes + to raw 234 country-code numbers without +", () => {
      expect(normalizePhoneNumber("2348012345678")).toBe("+2348012345678");
    });
  });

  describe("maskPhoneNumber", () => {
    it("masks internal characters of phone numbers", () => {
      expect(maskPhoneNumber("+2348012345678")).toBe("+234*****5678");
      expect(maskPhoneNumber("08012345678")).toBe("0801*****5678");
    });

    it("returns as-is if length is too short to mask safely", () => {
      expect(maskPhoneNumber("12345")).toBe("12345");
    });
  });

  describe("sendSms", () => {
    it("returns immediate test mode success in test environment", async () => {
      const service = new PremblySmsService();
      const result = await service.sendSms("+2348012345678", "Code: 123456");

      expect(result.success).toBe(true);
      expect(result.message).toContain("test mode");
    });

    it("calls premblyAxiosInstance when in production mode", async () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";
        (premblyAxiosInstance.post as jest.Mock).mockResolvedValue({
          data: { status: true, message: "Dispatched" },
        });

        const service = new PremblySmsService();
        const result = await service.sendSms("+2348012345678", "Code: 123456");

        expect(premblyAxiosInstance.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            phone_number: "+2348012345678",
            message: "Code: 123456",
          })
        );
        expect(result.success).toBe(true);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it("handles API failure in production mode", async () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = "production";
        (premblyAxiosInstance.post as jest.Mock).mockRejectedValue({
          response: { data: { message: "Insufficient balance" } },
          message: "Request failed with status code 400",
        });

        const service = new PremblySmsService();
        const result = await service.sendSms("+2348012345678", "Code: 123456");

        expect(result.success).toBe(false);
        expect(result.message).toBe("Insufficient balance");
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });
});
