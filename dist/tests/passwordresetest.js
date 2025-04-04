"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const emailResetController_1 = require("../controllers/emailResetController");
const verifyToken_1 = __importDefault(require("../utils/verifyToken"));
const comparePassword_1 = require("../utils/comparePassword");
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
};
const mockRequest = (body = {}, headers = {}) => {
    return { body, headers };
};
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
describe("PasswordResetController", () => {
    let controller;
    let next;
    beforeEach(() => {
        controller = new emailResetController_1.PasswordResetController(mockPrisma);
        next = jest.fn();
    });
    describe("ConfirmEmail", () => {
        it("should return 401 if no token is provided", async () => {
            const req = mockRequest({}, {});
            const res = mockResponse();
            await controller.ConfirmEmail(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
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
            const req = mockRequest({ email: "wrong@example.com" }, { authorization: "Bearer validtoken" });
            verifyToken_1.default.mockResolvedValue({
                email: "user@example.com",
            });
            await controller.ConfirmEmail(req, mockResponse(), next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
        });
        it("should return 404 if email is not found in database", async () => {
            const req = mockRequest({ email: "user@example.com" }, { authorization: "Bearer validtoken" });
            verifyToken_1.default.mockResolvedValue({
                email: "user@example.com",
            });
            mockPrisma.user.findUnique.mockResolvedValue(null);
            await controller.ConfirmEmail(req, mockResponse(), next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
        });
    });
    describe("passwordReset", () => {
        it("should return 400 if new password validation fails", async () => {
            const req = mockRequest({ token: "validtoken", newPassword: "short" });
            await controller.passwordReset(req, mockResponse(), next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        });
        it("should return 401 if token email does not match request email", async () => {
            const req = mockRequest({
                token: "validtoken",
                newPassword: "ValidPass123!",
                email: "wrong@example.com",
            });
            verifyToken_1.default.mockResolvedValue({
                email: "user@example.com",
            });
            await controller.passwordReset(req, mockResponse(), next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
        });
        it("should return 401 if user is not registered", async () => {
            const req = mockRequest({
                token: "validtoken",
                newPassword: "ValidPass123!",
                email: "user@example.com",
            });
            verifyToken_1.default.mockResolvedValue({
                email: "user@example.com",
            });
            mockPrisma.user.findUnique.mockResolvedValue(null);
            await controller.passwordReset(req, mockResponse(), next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
        });
        it("should return 400 if new password matches old password", async () => {
            const req = mockRequest({
                token: "validtoken",
                newPassword: "ValidPass123!",
                email: "user@example.com",
            });
            verifyToken_1.default.mockResolvedValue({
                email: "user@example.com",
            });
            mockPrisma.user.findUnique.mockResolvedValue({
                password: "hashedpassword",
            });
            comparePassword_1.comparePassword.mockResolvedValue(true);
            await controller.passwordReset(req, mockResponse(), next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        });
    });
});
