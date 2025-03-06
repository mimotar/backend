"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetController = void 0;
const zod_1 = require("zod");
const GlobalErrorHandler_1 = require("../middlewares/error/GlobalErrorHandler");
const prisma_1 = __importDefault(require("../utils/prisma"));
const createToken_1 = require("../utils/createToken");
const emailService_1 = require("../services/emailService");
const emailTypes_1 = require("../emails/templates/emailTypes");
class PasswordResetController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ConfirmEmail(req, res, next) {
        try {
            // email validation schema
            const emailSchema = zod_1.z.object({
                email: zod_1.z.string().email(),
            });
            const validationResult = emailSchema.safeParse(req.body);
            if (!validationResult.success) {
                const errors = validationResult.error.format().email?._errors;
                next(new GlobalErrorHandler_1.GlobalError("ZodError", String(errors?.[0]), 400, true));
                return;
            }
            const { email } = validationResult.data;
            // Check if email exists in database
            const verifyEmail = await prisma_1.default.user.findFirst({
                where: { email },
                select: { email: true, password: true },
            });
            if (!verifyEmail) {
                next(new GlobalErrorHandler_1.GlobalError("NotFound", "Email not found", 404, true));
                return;
            }
            //create token and new password form link
            const reset_token = await (0, createToken_1.createToken)(3600, validationResult.data);
            const resetPasswordUrl = `http://localhot:5000/reset-password?token=${reset_token}`;
            const linkObj = { resetLink: resetPasswordUrl };
            await (0, emailService_1.sendEmail)(email, emailTypes_1.EmailType.PASSWORD_RESET, linkObj);
            res.status(200).json({
                success: true,
                message: "Password reset request confirmed. Please check your email for further instructions.",
                email,
            });
            return;
        }
        catch (error) {
            if (error instanceof GlobalErrorHandler_1.GlobalError) {
                next(new GlobalErrorHandler_1.GlobalError(error.name, error.message, error.statusCode, error.operational));
                return;
            }
            if (error instanceof Error) {
                next(new GlobalErrorHandler_1.GlobalError(error.name, "Internal server Error", 500, false));
                return;
            }
            next(new GlobalErrorHandler_1.GlobalError("UnknownError", "Internal server Error", 500, false));
            return;
        }
    }
}
exports.PasswordResetController = PasswordResetController;
