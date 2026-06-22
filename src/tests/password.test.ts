import { PasswordController } from "../controllers/password.controller.js";
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
jest.mock("../services/emailService", () => ({
  sendEmail: jest.fn(),
  sendEmailWithTemplate: jest.fn(),
}));
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

describe("PasswordController", () => {
  let controller: PasswordController;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PasswordController(mockPrisma);
    next = jest.fn();
  });

  describe("forgotPassword", () => {
    it("should return 400 if no email is provided", async () => {
      const req = mockRequest({}, {});
      const res = mockResponse();
      await controller.forgotPassword(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    // it("should return 400 if email validation fails", async () => {
    //   const req = mockRequest({}, { authorization: "Bearer validtoken" });
    //   (VerifyToken as jest.Mock).mockResolvedValue({
    //     email: "user@example.com",
    //   });
    //   await controller.forgotPassword(req, mockResponse(), next);
    //   expect(next).toHaveBeenCalledWith(
    //     expect.objectContaining({ statusCode: 400 })
    //   );
    // });

    it("should return 404 if the requested email is not registered", async () => {
      const req = mockRequest(
        { email: "wrong@example.com" },
        { authorization: "Bearer validtoken" }
      );
      (VerifyToken as jest.Mock).mockResolvedValue({
        email: "user@example.com",
      });
      await controller.forgotPassword(req, mockResponse(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
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
      await controller.forgotPassword(req, mockResponse(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });

  describe("resetPassword", () => {
    it("should return 400 if new password validation fails", async () => {
      const req = mockRequest({ token: "validtoken", newPassword: "short" });
      await controller.resetPassword(req, mockResponse(), next);
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
      await controller.resetPassword(req, mockResponse(), next);
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
      await controller.resetPassword(req, mockResponse(), next);
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
      await controller.resetPassword(req, mockResponse(), next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });
});
