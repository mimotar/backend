import { PasswordResetController } from "../controllers/emailResetController";
import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";
import { createToken } from "../utils/createToken";
import { sendEmail } from "../services/emailService";
import VerifyToken from "../utils/verifyToken";
import { hashPassword } from "../utils/HashPassword";
import { comparePassword } from "../utils/comparePassword";

jest.mock("../utils/createToken", () => ({
  createToken: jest.fn().mockResolvedValue("mocked_reset_token"),
}));

jest.mock("../services/emailService", () => ({
  sendEmail: jest.fn(),
}));

jest.mock("../utils/verifyToken", () =>
  jest.fn().mockResolvedValue("test@example.com")
);

jest.mock("../utils/HashPassword", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed_password"),
}));

jest.mock("../utils/comparePassword", () => ({
  comparePassword: jest.fn().mockResolvedValue(false),
}));

describe("PasswordResetController", () => {
  let controller: PasswordResetController;
  let prismaMock: jest.Mocked<PrismaClient>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaClient>;

    controller = new PasswordResetController(prismaMock);

    req = { body: {}, headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe("ConfirmEmail", () => {
    it("should return 400 if email validation fails", async () => {
      req.body = { email: "invalid-email" };

      await controller.ConfirmEmail(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(GlobalError));
      expect((next as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
    });

    it("should return 403 if email doesn't match current user", async () => {
      req.body = { email: "other@example.com" };

      await controller.ConfirmEmail(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(GlobalError));
      expect((next as jest.Mock).mock.calls[0][0].statusCode).toBe(403);
    });

    it("should return 404 if email is not found", async () => {
      req.body = { email: "test@example.com" };
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

      await controller.ConfirmEmail(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(GlobalError));
      expect((next as jest.Mock).mock.calls[0][0].statusCode).toBe(404);
    });

    it("should send reset email successfully", async () => {
      req.body = { email: "test@example.com" };
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
        email: "test@example.com",
        password: "hashed_password",
      });

      await controller.ConfirmEmail(req as Request, res as Response, next);

      expect(sendEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.any(String),
        expect.objectContaining({
          resetLink: expect.stringContaining("reset-password?token="),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe("passwordReset", () => {
    it("should return 400 if password validation fails", async () => {
      req.body = { newPassword: "short" };

      await controller.passwordReset(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(GlobalError));
      expect((next as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
    });

    it("should return 401 if token email does not match request email", async () => {
      req.body = {
        token: "mockToken",
        newPassword: "StrongPass@123",
        email: "wrong@example.com",
      };
      (VerifyToken as jest.Mock).mockResolvedValue("different@example.com");

      await controller.passwordReset(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(GlobalError));
      expect((next as jest.Mock).mock.calls[0][0].statusCode).toBe(401);
    });

    it("should return 400 if new password matches old password", async () => {
      req.body = {
        token: "mockToken",
        newPassword: "StrongPass@123",
        email: "test@example.com",
      };
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
        email: "test@example.com",
        password: "hashed_password",
      });
      (comparePassword as jest.Mock).mockResolvedValue(true); // Passwords match

      await controller.passwordReset(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(GlobalError));
      expect((next as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
    });

    it("should reset password successfully", async () => {
      req.body = {
        token: "mockToken",
        newPassword: "StrongPass@123",
        email: "test@example.com",
      };
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
        email: "test@example.com",
        password: "old_hashed_password",
      });
      (comparePassword as jest.Mock).mockResolvedValue(false); // Passwords do not match
      (prismaMock.user.update as jest.Mock).mockResolvedValue({
        email: "test@example.com",
        password: "new_hashed_password",
      });

      await controller.passwordReset(req as Request, res as Response, next);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
        data: { password: "hashed_password" },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        msg: "password reset successful",
      });
    });
  });
});
