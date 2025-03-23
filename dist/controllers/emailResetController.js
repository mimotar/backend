"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetController = void 0;
const zod_1 = require("zod");
const GlobalErrorHandler_1 = require("../middlewares/error/GlobalErrorHandler");
const createToken_1 = require("../utils/createToken");
const emailService_1 = require("../services/emailService");
const verifyToken_1 = __importDefault(require("../utils/verifyToken"));
const HashPassword_1 = require("../utils/HashPassword");
const comparePassword_1 = require("../utils/comparePassword");
const env_1 = require("../config/env");
class PasswordResetController {
    constructor(prismaClient) {
        this.prisma = prismaClient;
    }
    async ConfirmEmail(req, res, next) {
        try {
            // const authHeader = req.headers.authorization;
            // if (!authHeader || !authHeader.startsWith("Bearer ")) {
            //   next(new GlobalError("Unauthorized", "No token provided", 401, true));
            //   return;
            // }
            // const token = authHeader.split(" ")[1];
            // // console.log(token);
            // const tokenDecoded = await VerifyToken(token);
            // const currentUser: { userId: string; email: string } =
            //   JSON.parse(tokenDecoded);
            // console.log(tokenDecoded, currentUser);
            // validation the email u want to reset
            const emailSchema = zod_1.z.object({
                email: zod_1.z.string().email(),
            });
            const validationResult = emailSchema.safeParse(req.body);
            // if (!validationResult.success) {
            //   const errors = validationResult.error.format().email?._errors;
            //   next(new GlobalError("ZodError", String(errors?.[0]), 400, true));
            //   return;
            // }
            // const { email } = validationResult.data;
            // //check if the current user email is the same with the email sent  to reset password.
            // // this is to prevent user from resetting other user passwords
            // if (currentUser.email !== email) {
            //   next(
            //     new GlobalError(
            //       "Forbidden",
            //       "You are not allowed to reset other user password",
            //       403,
            //       true
            //     )
            //   );
            //   return;
            // }
            // // Check if email exists in database
            // const verifyEmailInDb = await this.prisma.user.findUnique({
            //   where: { email },
            //   select: { email: true, password: true },
            // });
            // console.log(verifyEmailInDb);
            // if (!verifyEmailInDb) {
            //   next(
            //     new GlobalError(
            //       "EmailNotFound",
            //       "The email you provided does not exist",
            //       404,
            //       true
            //     )
            //   );
            //   return;
            // }
            //create token and new password form link
            const reset_token = await (0, createToken_1.createToken)(3600, validationResult.data);
            const resetPasswordUrl = `${env_1.env.FRONTEND_URL}/reset-password?token=${reset_token}`;
            const linkObj = {
                firstname: validationResult.data?.email,
                link: resetPasswordUrl,
            };
            await (0, emailService_1.sendEmailWithTemplate)("josephuzuegbu55@gmail.com", linkObj, 2);
            res.status(200).json({
                success: true,
                message: "Password reset request confirmed. Please check your email for further instructions.",
                // email,
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
    async passwordReset(req, res, next) {
        try {
            const { token, newPassword, email } = req.body;
            const passwordSchema = zod_1.z.object({
                newPassword: zod_1.z
                    .string()
                    .min(8, "Password must be at least 8 characters long")
                    .max(32, "Password cannot be longer than 32 characters")
                    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
                    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
                    .regex(/[0-9]/, "Password must contain at least one number")
                    .regex(/[@$!%*?&]/, "Password must contain at least one special character (@$!%*?&)"),
            });
            const validatePassword = passwordSchema.safeParse({
                newPassword: newPassword,
            });
            if (!validatePassword.success) {
                const errors = validatePassword.error.format().newPassword?._errors;
                next(new GlobalErrorHandler_1.GlobalError("ZodError", String(errors?.[0]), 400, true));
                return;
            }
            //validate the token
            const tokenDecoded = await (0, verifyToken_1.default)(token);
            // console.log(tokenDecoded);
            //making sure it was the user who make the password reset request
            if (tokenDecoded.email !== email) {
                next(new GlobalErrorHandler_1.GlobalError("UnauthorizedPasswordReset", "Security bridge: You are not the user who make the password request", 401, true));
                return;
            }
            //MAKE SURE THE USER IS NOT SENDING THE SAME PASSWORD as of old one
            //the db password of the current user
            const dbCredential = await this.prisma.user.findUnique({
                where: { email: email },
            });
            console.log("hello", dbCredential);
            //check if the new password and old password match
            const password_compare = await (0, comparePassword_1.comparePassword)(newPassword, dbCredential?.password);
            if (password_compare) {
                next(new GlobalErrorHandler_1.GlobalError("SamePasswordError", "new Password matches the old password. Insert a new unique password", 400, true));
                return;
            }
            //hash password
            const hash_Password = await (0, HashPassword_1.hashPassword)(newPassword);
            await this.prisma.user.update({
                where: {
                    email: email,
                },
                data: {
                    password: hash_Password,
                },
            });
            res.status(200).json({ success: true, msg: "password reset successful" });
            return;
        }
        catch (error) {
            if (error instanceof GlobalErrorHandler_1.GlobalError) {
                next(new GlobalErrorHandler_1.GlobalError(error.name, error.message, error.statusCode, error.operational));
                return;
            }
            if (error instanceof Error) {
                next(new GlobalErrorHandler_1.GlobalError(error.name, error.message, 500, false));
                return;
                // "Internal server Error"
            }
            next(new GlobalErrorHandler_1.GlobalError("UnknownError", "Internal server Error", 500, false));
            return;
        }
    }
}
exports.PasswordResetController = PasswordResetController;
