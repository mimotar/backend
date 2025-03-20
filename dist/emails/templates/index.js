"use strict";
// //index.ts
// import { EmailType } from "./emailTypes";
// import getPasswordResetEmail from "./resetPassword";
// import getWelcomeEmail from "./welcomeEmail";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmailTemplate = getEmailTemplate;
// export function getEmailTemplate(type: EmailType, params: Record<string, any>) {
//   switch (type) {
//     case EmailType.WELCOME:
//       return getWelcomeEmail(params.name);
//     case EmailType.PASSWORD_RESET:
//       return getPasswordResetEmail(params.resetLink);
//     default:
//       throw new Error("Invalid email type");
//   }
// }
const emailTypes_1 = require("./emailTypes");
const resetPassword_1 = __importDefault(require("./resetPassword"));
const welcomeEmail_1 = __importDefault(require("./welcomeEmail"));
const verifyEmail_1 = __importDefault(require("./verifyEmail"));
function getEmailTemplate(type, params) {
    switch (type) {
        case emailTypes_1.EmailType.WELCOME:
            return (0, welcomeEmail_1.default)(params.name);
        case emailTypes_1.EmailType.PASSWORD_RESET:
            return (0, resetPassword_1.default)(params.resetLink);
        case emailTypes_1.EmailType.VERIFY_EMAIL:
            return (0, verifyEmail_1.default)(params.verificationLink);
        default:
            throw new Error("Invalid email type");
    }
}
