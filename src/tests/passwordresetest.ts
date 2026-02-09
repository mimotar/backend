import { PasswordResetController } from "../controllers/emailResetController.js";
import { PrismaClient } from "../generated/prisma/client.js";
import { Request, Response, NextFunction } from "express";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import { createToken } from "../utils/createToken.js";
import { sendEmailWithTemplate } from "../services/emailService.js";
import VerifyToken from "../utils/verifyToken.js";
import { hashPassword } from "../utils/HashPassword.js";
import { comparePassword } from "../utils/comparePassword.js";
import { env } from "../config/env.js";

jest.mock("../utils/verifyToken");
jest.mock("../services/emailService");
jest.mock("../utils/createToken");
jest.mock("../utils/HashPassword");
jest.mock("../utils/comparePassword");

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

const mockRequest = (body = {}, headers = {}) => {
  return { body, headers } as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("PasswordResetController", () => {
  let controller: PasswordResetController;
  let next: NextFunction;

  beforeEach(() => {
    controller = new PasswordResetController(mockPrisma);
    next = jest.fn();
  });

  describe("ConfirmEmail", () => {
    it("should return 401 if no token is provided", async () => {
      const req = mockRequest({}, {});
      const res = mockResponse();
      await controller.ConfirmEmail(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 })
      );
    });

    // it("should return 400 if email validation fails", async () => {
    //   const req = mockRequest({}, { authorization: "Bearer validtoken" });
    //   (VerifyToken as jest.Mock).mockResolvedValue({
    //     email: "user@example.com",
    //   });
    //   await controller.ConfirmEmail(req, mockResponse(), next);
    //   expect(next).toHaveBeenCalledWith(
    //     expect.objectContaining({ statusCode: 400 })
    //   );
    // });

    it("should return 403 if the token email does not match request email", async () => {
      const req = mockRequest(
        { email: "wrong@example.com" },
        { authorization: "Bearer validtoken" }
      );
      (VerifyToken as jest.Mock).mockResolvedValue({
        email: "user@example.com",
      });
      await controller.ConfirmEmail(req, mockResponse(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it("should return 404 if email is not found in database", async () => {
      const req = mockRequest(
        { email: "user@example.com" },
        { authorization: "Bearer validtoken" }
      );
      (VerifyToken as jest.Mock).mockResolvedValue({
        email: "user@example.com",
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await controller.ConfirmEmail(req, mockResponse(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });

  describe("passwordReset", () => {
    it("should return 400 if new password validation fails", async () => {
      const req = mockRequest({ token: "validtoken", newPassword: "short" });
      await controller.passwordReset(req, mockResponse(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it("should return 401 if token email does not match request email", async () => {
      const req = mockRequest({
        token: "validtoken",
        newPassword: "ValidPass123!",
        email: "wrong@example.com",
      });
      (VerifyToken as jest.Mock).mockResolvedValue({
        email: "user@example.com",
      });
      await controller.passwordReset(req, mockResponse(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 })
      );
    });

    it("should return 401 if user is not registered", async () => {
      const req = mockRequest({
        token: "validtoken",
        newPassword: "ValidPass123!",
        email: "user@example.com",
      });
      (VerifyToken as jest.Mock).mockResolvedValue({
        email: "user@example.com",
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await controller.passwordReset(req, mockResponse(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 })
      );
    });

    it("should return 400 if new password matches old password", async () => {
      const req = mockRequest({
        token: "validtoken",
        newPassword: "ValidPass123!",
        email: "user@example.com",
      });
      (VerifyToken as jest.Mock).mockResolvedValue({
        email: "user@example.com",
      });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        password: "hashedpassword",
      });
      (comparePassword as jest.Mock).mockResolvedValue(true);
      await controller.passwordReset(req, mockResponse(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });
});
