import apiInstance from "../config/brevo.js";
import { env } from "../config/env.js";
import { getEmailTemplate } from "../emails/templates/index.js";
import { EmailType } from "../emails/templates/emailTypes.brevo.js";
import axios from "axios";
import { systemDispatchNotificationByEmail } from "./notification/notification.service.js";

export async function sendEmail(
  to: string,
  type: EmailType,
  params: Record<string, any>
) {
  try {
    const { subject, htmlContent } = getEmailTemplate(type, params);

    await apiInstance.sendTransacEmail({
      sender: { email: env.EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent,
    });

    // Fire notification natively
    await systemDispatchNotificationByEmail(
      to,
      subject,
      `You have a new update regarding: ${type.replace(/_/g, " ").toLowerCase()}`
    );

    console.log(`Email sent successfully: ${type}`);
    return { success: true, message: `Email sent: ${type}` };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error?.message };
  }
}

export async function sendEmailWithTemplate(
  to: string,
  params: Record<string, any>,
  templateId: number
) {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { email: env.SENDER_EMAIL },
        to: [{ email: to }],
        templateId,
        params,
      },
      {
        headers: {
          accept: "application/json",
          "api-key": env.BREVO_API_KEY,
          "content-type": "application/json",
        },
      }
    );

    let title = "New Notification";
    let content = "You have a new update.";
    
    switch (templateId) {
      case 3:
        title = "OTP Verification";
        content = "Your OTP for verification has been sent.";
        break;
      case 6:
        title = "New Transaction Request";
        content = "You have received a new transaction ticket.";
        break;
      case 7:
        title = "Transaction Created";
        content = "Your transaction ticket has been successfully created.";
        break;
      case 8:
        title = "Validation Token";
        content = "Your transaction validation token has been generated.";
        break;
    }

    await systemDispatchNotificationByEmail(to, title, content);

    return { success: true, message: `Email sent` };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error?.message };
  }
}
