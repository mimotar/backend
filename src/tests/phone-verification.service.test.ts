import prisma from "../utils/prisma.js";
import {
  sendPhoneOtpService,
  verifyPhoneOtpService,
} from "../services/profile/phoneVerification.service.js";
import { premblySmsService } from "../services/sms/premblySms.service.js";

jest.mock("../utils/prisma.js", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    profile: {
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("../services/sms/premblySms.service.js", () => {
  const actual = jest.requireActual("../services/sms/premblySms.service.js");
  return {
    ...actual,
    premblySmsService: {
      sendSms: jest.fn(),
    },
  };
});

const prismaUser = prisma.user as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
};

const prismaProfile = prisma.profile as unknown as {
  update: jest.Mock;
  create: jest.Mock;
};

describe("Phone Verification Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendPhoneOtpService", () => {
    it("returns 404 when user is not found", async () => {
      prismaUser.findUnique.mockResolvedValue(null);

      const result = await sendPhoneOtpService(999, "+2348012345678");

      expect(result.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.message).toBe("User not found");
    });

    it("returns 400 when no phone number is provided and profile has none", async () => {
      prismaUser.findUnique.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        profile: null,
      });

      const result = await sendPhoneOtpService(1);

      expect(result.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.message).toContain("No phone number provided");
    });

    it("returns 400 when phone number format is invalid", async () => {
      prismaUser.findUnique.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        profile: null,
      });

      const result = await sendPhoneOtpService(1, "invalid-phone");

      expect(result.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid phone number format");
    });

    it("enforces 60-second cooldown if OTP was recently sent", async () => {
      const recentDate = new Date(Date.now() - 30 * 1000); // 30s ago
      prismaUser.findUnique.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        profile: {
          id: 10,
          user_id: 1,
          phone_no: "+2348012345678",
          phoneOtp: "123456",
          phoneOtpCreatedAt: recentDate,
        },
      });

      const result = await sendPhoneOtpService(1);

      expect(result.status).toBe(429);
      expect(result.success).toBe(false);
      expect(result.message).toContain("Please wait");
      expect(premblySmsService.sendSms).not.toHaveBeenCalled();
    });

    it("successfully creates OTP, saves to profile, and dispatches SMS via Prembly", async () => {
      prismaUser.findUnique.mockResolvedValue({
        id: 2,
        email: "user@example.com",
        profile: {
          id: 20,
          user_id: 2,
          phone_no: "+2348011223344",
          phoneOtp: null,
          phoneOtpCreatedAt: null,
        },
      });
      prismaProfile.update.mockResolvedValue({});
      (premblySmsService.sendSms as jest.Mock).mockResolvedValue({
        success: true,
        message: "Sent",
      });

      const result = await sendPhoneOtpService(2);

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      expect(prismaProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: 2 },
          data: expect.objectContaining({
            phoneOtp: expect.stringMatching(/^\d{6}$/),
            pendingPhone: "+2348011223344",
          }),
        })
      );
      expect(premblySmsService.sendSms).toHaveBeenCalledWith(
        "+2348011223344",
        expect.stringContaining("Your Mimotar phone verification code is:")
      );
    });

    it("allows specifying a new target phone number and saves it as pendingPhone", async () => {
      prismaUser.findUnique.mockResolvedValue({
        id: 3,
        email: "user@example.com",
        profile: null,
      });
      prismaProfile.create.mockResolvedValue({});
      (premblySmsService.sendSms as jest.Mock).mockResolvedValue({
        success: true,
        message: "Sent",
      });

      const result = await sendPhoneOtpService(3, "08099887766");

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      expect(prismaProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: 3,
            phoneOtp: expect.stringMatching(/^\d{6}$/),
            pendingPhone: "+2348099887766",
          }),
        })
      );
      expect(premblySmsService.sendSms).toHaveBeenCalledWith(
        "+2348099887766",
        expect.any(String)
      );
    });
  });

  describe("verifyPhoneOtpService", () => {
    it("returns 400 if OTP is missing or not a 6-digit string", async () => {
      const result1 = await verifyPhoneOtpService(1, "");
      expect(result1.status).toBe(400);

      const result2 = await verifyPhoneOtpService(1, "123");
      expect(result2.status).toBe(400);
    });

    it("returns 404 if user not found", async () => {
      prismaUser.findUnique.mockResolvedValue(null);

      const result = await verifyPhoneOtpService(999, "123456");

      expect(result.status).toBe(404);
      expect(result.success).toBe(false);
    });

    it("returns 400 if profile has no active OTP request", async () => {
      prismaUser.findUnique.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        profile: {
          id: 10,
          phoneOtp: null,
          phoneOtpCreatedAt: null,
        },
      });

      const result = await verifyPhoneOtpService(1, "123456");

      expect(result.status).toBe(400);
      expect(result.message).toContain("No active phone verification code found");
    });

    it("returns 400 and clears OTP if OTP has expired (>10 minutes)", async () => {
      const expiredDate = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
      prismaUser.findUnique.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        profile: {
          id: 10,
          phoneOtp: "123456",
          phoneOtpCreatedAt: expiredDate,
        },
      });
      prismaProfile.update.mockResolvedValue({});

      const result = await verifyPhoneOtpService(1, "123456");

      expect(result.status).toBe(400);
      expect(result.message).toContain("Verification code has expired");
      expect(prismaProfile.update).toHaveBeenCalledWith({
        where: { user_id: 1 },
        data: {
          phoneOtp: null,
          phoneOtpCreatedAt: null,
        },
      });
    });

    it("returns 400 if OTP does not match", async () => {
      const recentDate = new Date();
      prismaUser.findUnique.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        profile: {
          id: 10,
          phoneOtp: "654321",
          phoneOtpCreatedAt: recentDate,
        },
      });

      const result = await verifyPhoneOtpService(1, "111111");

      expect(result.status).toBe(400);
      expect(result.message).toBe("Invalid verification code.");
      expect(prismaProfile.update).not.toHaveBeenCalled();
    });

    it("successfully sets phoneVerified: true, updates phone_no from pendingPhone, and clears OTP fields", async () => {
      const recentDate = new Date();
      prismaUser.findUnique
        .mockResolvedValueOnce({
          id: 5,
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          profile: {
            id: 25,
            phone_no: null,
            phoneOtp: "888999",
            phoneOtpCreatedAt: recentDate,
            pendingPhone: "+2348099887766",
            phoneVerified: false,
          },
        })
        .mockResolvedValueOnce({
          id: 5,
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          profile: {
            id: 25,
            phone_no: "+2348099887766",
            phoneOtp: null,
            phoneOtpCreatedAt: null,
            pendingPhone: null,
            phoneVerified: true,
          },
        });

      prismaProfile.update.mockResolvedValue({});

      const result = await verifyPhoneOtpService(5, "888999");

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain("Phone number verified successfully");
      expect(prismaProfile.update).toHaveBeenCalledWith({
        where: { user_id: 5 },
        data: {
          phoneVerified: true,
          phone_no: "+2348099887766",
          phoneOtp: null,
          phoneOtpCreatedAt: null,
          pendingPhone: null,
        },
      });
    });
  });
});
