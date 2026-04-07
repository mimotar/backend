// //index.ts
// import { EmailType } from "./emailTypes";
// import getPasswordResetEmail from "./resetPassword";
// import getWelcomeEmail from "./welcomeEmail";


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


import { EmailType } from "./emailTypes.brevo.js";
import getPasswordResetEmail from "./resetPassword.js";
import getWelcomeEmail from "./welcomeEmail.js";
import getVerifyEmailTemplate from "./verifyEmail.js";
import getPasswordResetOtpEmail from "./passwordResetOtp.js";
import getChangePasswordOtpEmail from "./changePasswordOtp.js";
import {
    getTransactionCompletedEmail,
    getTransactionDisputedEmail,
    getTransactionPendingClosureCounterpartyEmail,
    getTransactionPendingClosureInitiatorEmail
} from "./transactionEmails.js";

export function getEmailTemplate(type: EmailType, params: Record<string, any>) {
    switch (type) {
        case EmailType.WELCOME:
            return getWelcomeEmail(params.name);
        case EmailType.PASSWORD_RESET:
            return getPasswordResetEmail(params.resetLink);
        case EmailType.VERIFY_EMAIL:
            return getVerifyEmailTemplate(params.verificationLink);
        case EmailType.TRANSACTION_PENDING_CLOSURE_INITIATOR:
            return getTransactionPendingClosureInitiatorEmail(params.name, params.transactionId);
        case EmailType.TRANSACTION_PENDING_CLOSURE_COUNTERPARTY:
            return getTransactionPendingClosureCounterpartyEmail(params.name, params.transactionId);
        case EmailType.TRANSACTION_COMPLETED:
            return getTransactionCompletedEmail(params.name, params.transactionId, params.autoCompleted);
        case EmailType.TRANSACTION_DISPUTED:
            return getTransactionDisputedEmail(params.name, params.transactionId);
        case EmailType.PASSWORD_RESET_OTP:
            return getPasswordResetOtpEmail(params.otp);
        case EmailType.CHANGE_PASSWORD_OTP:
            return getChangePasswordOtpEmail(params.otp);
        default:
            throw new Error("Invalid email type");
    }
}
