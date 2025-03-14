"use strict";
// const SibApiV3Sdk = require("sib-api-v3-sdk");
// const { brevoApiKey } = require("../config/env");
// type Recipient = {
//   email: string;
//   name?: string;
// };
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
// // ✅ Define Type for Sender
// type Sender = {
//   email: string;
//   name?: string;
// };
// if (!brevoApiKey) {
//   throw new Error("Missing Brevo API Key in environment variables.");
// }
// const client = SibApiV3Sdk.ApiClient.instance;
// client.authentications["api-key"].apiKey = brevoApiKey;
// const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
// const sendBrevoEmail =  async (
//   to: Recipient[],
//   subject: string,
//   htmlContent: string,
//   sender: Sender = { email: "no-reply@yourdomain.com", name: "Your Company" }
// ): Promise<any> => {
//   const emailData = {
//     sender,
//     to,
//     subject,
//     htmlContent,
//   };
//   try {
//     const response = await apiInstance.sendTransacEmail(emailData);
//     console.log("✅ Email sent successfully:", response);
//     return response;
//   } catch (error) {
//     console.error("❌ Error sending email:", error);
//     throw new Error("Failed to send email");
//   }
// }
// module.exports = { sendBrevoEmail };
const brevo_1 = __importDefault(require("../config/brevo"));
const templates_1 = require("../emails/templates");
async function sendEmail(to, type, params) {
    try {
        const { subject, htmlContent } = (0, templates_1.getEmailTemplate)(type, params);
        await brevo_1.default.sendTransacEmail({
            to: [{ email: to }],
            subject,
            htmlContent,
        });
        console.log(`Email sent successfully: ${type}`);
        return { success: true, message: `Email sent: ${type}` };
    }
    catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error: error?.message };
    }
}
