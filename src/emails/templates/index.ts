import { EmailType } from "./emailTypes";
import getPasswordResetEmail from "./resetPassword";
import getWelcomeEmail from "./welcomeEmail";


export function getEmailTemplate(type: EmailType, params: Record<string, any>) {
  switch (type) {
    case EmailType.WELCOME:
      return getWelcomeEmail(params.name);
    case EmailType.PASSWORD_RESET:
      return getPasswordResetEmail(params.resetLink);
  
    default:
      throw new Error("Invalid email type");
  }
}
