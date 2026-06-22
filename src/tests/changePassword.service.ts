import prisma from "../utils/prisma.js";
import { comparePassword } from "../utils/comparePassword.js";
import { hashPassword } from "../utils/HashPassword.js";
import { generateSixDigitString } from "../utils/OTPGenerator.js";
import { sendEmail } from "../services/emailService.js";
import {
  completePasswordChange,
  requestPasswordChange,
} from "../services/auth/changePassword.service.js";

jest.mock("../utils/prisma.js", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("../utils/comparePassword.js", () => ({ comparePassword: jest.fn() }));
jest.mock("../utils/HashPassword.js", () => ({ hashPassword: jest.fn() }));
jest.mock("../utils/OTPGenerator.js", () => ({ generateSixDigitString: jest.fn() }));
jest.mock("../services/emailService.js", () => ({ sendEmail: jest.fn() }));

const userRepository = prisma.user as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};

describe("change password service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores a purpose-scoped OTP and the pending password hash", async () => {
    userRepository.findUnique.mockResolvedValue({
      id: 7,
      email: "user@example.com",
      password: "current-hash",
    });
    (comparePassword as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    (hashPassword as jest.Mock).mockResolvedValue("pending-hash");
    (generateSixDigitString as jest.Mock).mockReturnValue("123456");
    (sendEmail as jest.Mock).mockResolvedValue({ success: true });
    userRepository.update.mockResolvedValue({});

    await requestPasswordChange(7, {
      currentPassword: "Current1!",
      newPassword: "NewPassword1!",
      confirmPassword: "NewPassword1!",
    });

    expect(userRepository.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({
        otp: "123456",
        otpPurpose: "CHANGE_PASSWORD",
        pendingPasswordHash: "pending-hash",
      }),
    });
  });

  it("applies the pending password and consumes the OTP once", async () => {
    userRepository.findUnique.mockResolvedValue({
      id: 7,
      otp: "123456",
      otpCreatedAt: new Date(),
      otpPurpose: "CHANGE_PASSWORD",
      pendingPasswordHash: "pending-hash",
    });
    userRepository.updateMany.mockResolvedValue({ count: 1 });

    await completePasswordChange(7, "123456");

    expect(userRepository.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        otp: "123456",
        otpPurpose: "CHANGE_PASSWORD",
        pendingPasswordHash: "pending-hash",
      },
      data: {
        password: "pending-hash",
        otp: null,
        otpCreatedAt: null,
        otpPurpose: null,
        pendingPasswordHash: null,
      },
    });
  });

  it("rejects an OTP issued for another purpose", async () => {
    userRepository.findUnique.mockResolvedValue({
      id: 7,
      otp: "123456",
      otpCreatedAt: new Date(),
      otpPurpose: "PASSWORD_RESET",
      pendingPasswordHash: "pending-hash",
    });

    await expect(completePasswordChange(7, "123456")).rejects.toMatchObject({
      name: "PasswordChangeNotRequested",
      statusCode: 400,
    });
  });

  it("clears and rejects an expired change-password OTP", async () => {
    userRepository.findUnique.mockResolvedValue({
      id: 7,
      otp: "123456",
      otpCreatedAt: new Date(Date.now() - 16 * 60 * 1000),
      otpPurpose: "CHANGE_PASSWORD",
      pendingPasswordHash: "pending-hash",
    });
    userRepository.updateMany.mockResolvedValue({ count: 1 });

    await expect(completePasswordChange(7, "123456")).rejects.toMatchObject({
      name: "ExpiredOTP",
      statusCode: 400,
    });
    expect(userRepository.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7, otpPurpose: "CHANGE_PASSWORD" },
      })
    );
  });
});
