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

export function getEmailTemplate(type: EmailType, params: Record<string, any>) {
    switch (type) {
        case EmailType.WELCOME:
            return getWelcomeEmail(params.name);
        case EmailType.PASSWORD_RESET:
            return getPasswordResetEmail(params.resetLink);
        case EmailType.VERIFY_EMAIL:
            return getVerifyEmailTemplate(params.verificationLink);
        default:
            throw new Error("Invalid email type");
    }
}
