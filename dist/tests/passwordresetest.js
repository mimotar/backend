"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const emailResetController_1 = require("../controllers/emailResetController");
const GlobalErrorHandler_1 = require("../middlewares/error/GlobalErrorHandler");
const emailService_1 = require("../services/emailService");
const verifyToken_1 = __importDefault(require("../utils/verifyToken"));
const comparePassword_1 = require("../utils/comparePassword");
const emailTypes_1 = require("../emails/templates/emailTypes");
jest.mock("../utils/createToken", () => ({
    createToken: jest.fn().mockResolvedValue("mocked_reset_token"),
}));
jest.mock("../services/emailService", () => ({
    sendEmail: jest.fn(),
}));
jest.mock("../utils/verifyToken", () => jest.fn().mockResolvedValue("test@example.com"));
jest.mock("../utils/HashPassword", () => ({
    hashPassword: jest.fn().mockResolvedValue("hashed_password"),
}));
jest.mock("../utils/comparePassword", () => ({
    comparePassword: jest.fn().mockResolvedValue(false),
}));
describe("PasswordResetController", () => {
    let controller;
    let prismaMock;
    let req;
    let res;
    let next;
    beforeEach(() => {
        prismaMock = {
            user: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
        };
        controller = new emailResetController_1.PasswordResetController(prismaMock);
        req = { body: {}, headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        req = {}; // Reset request object
        next = jest.fn(); // Reset the next function
    });
    describe("ConfirmEmail", () => {
        it("should return 400 if email validation fails", async () => {
            req.body = { email: "invalid-email" };
            await controller.ConfirmEmail(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(GlobalErrorHandler_1.GlobalError));
            expect(next.mock.calls[0][0].statusCode).toBe(400);
        });
        it("should return 403 if email doesn't match current user", async () => {
            req.body = { email: "other@example.com" };
            await controller.ConfirmEmail(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(GlobalErrorHandler_1.GlobalError));
            expect(next.mock.calls[0][0].statusCode).toBe(403);
        });
        it("should return 404 if email is not found", async () => {
            req.body = { email: "test@example.com" };
            prismaMock.user.findUnique.mockResolvedValue(null);
            await controller.ConfirmEmail(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(GlobalErrorHandler_1.GlobalError));
            expect(next.mock.calls[0][0].statusCode).toBe(404);
        });
        it("should send reset email successfully", async () => {
            req.body = { email: "test@example.com" };
            prismaMock.user.findUnique.mockResolvedValue({
                email: "test@example.com",
                password: "hashed_password",
            });
            await controller.ConfirmEmail(req, res, next);
            expect(emailService_1.sendEmail).toHaveBeenCalledWith("test@example.com", expect.any(emailTypes_1.EmailType), expect.objectContaining({
                resetLink: expect.stringContaining("reset-password?token="),
            }));
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });
    describe("passwordReset", () => {
        it("should return 400 if password validation fails", async () => {
            req.body = { newPassword: "short" };
            await controller.passwordReset(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(GlobalErrorHandler_1.GlobalError));
            expect(next.mock.calls[0][0].statusCode).toBe(400);
        });
        it("should return 401 if token email does not match request email", async () => {
            req.body = {
                token: "mockToken",
                newPassword: "StrongPass@123",
                email: "wrong@example.com",
            };
            verifyToken_1.default.mockResolvedValue("different@example.com");
            await controller.passwordReset(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(GlobalErrorHandler_1.GlobalError));
            expect(next.mock.calls[0][0].statusCode).toBe(401);
        });
        it("should return 400 if new password matches old password", async () => {
            req.body = {
                token: "mockToken",
                newPassword: "StrongPass@123",
                email: "test@example.com",
            };
            prismaMock.user.findUnique.mockResolvedValue({
                email: "test@example.com",
                password: "hashed_password",
            });
            comparePassword_1.comparePassword.mockResolvedValue(true); // Passwords match
            await controller.passwordReset(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(GlobalErrorHandler_1.GlobalError));
            expect(next.mock.calls[0][0].statusCode).toBe(400);
        });
        it("should reset password successfully", async () => {
            req.body = {
                token: "mockToken",
                newPassword: "StrongPass@123",
                email: "test@example.com",
            };
            prismaMock.user.findUnique.mockResolvedValue({
                email: "test@example.com",
                password: "old_hashed_password",
            });
            comparePassword_1.comparePassword.mockResolvedValue(false); // Passwords do not match
            prismaMock.user.update.mockResolvedValue({
                email: "test@example.com",
                password: "new_hashed_password",
            });
            await controller.passwordReset(req, res, next);
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
