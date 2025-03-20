"use strict";
// // const SibApiV3Sdk = require("sib-api-v3-sdk");
// // const { brevoApiKey } = require("../config/env");
// // type Recipient = {
// //   email: string;
// //   name?: string;
// // };
// // // ✅ Define Type for Sender
// // type Sender = {
// //   email: string;
// //   name?: string;
// // };
// // if (!brevoApiKey) {
// //   throw new Error("Missing Brevo API Key in environment variables.");
// // }
// // const client = SibApiV3Sdk.ApiClient.instance;
// // client.authentications["api-key"].apiKey = brevoApiKey;
// // const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
// // const sendBrevoEmail =  async (
// //   to: Recipient[], 
// //   subject: string, 
// //   htmlContent: string, 
// //   sender: Sender = { email: "no-reply@yourdomain.com", name: "Your Company" }
// // ): Promise<any> => {
// //   const emailData = {
// //     sender,
// //     to,
// //     subject,
// //     htmlContent,
// //   };
// //   try {
// //     const response = await apiInstance.sendTransacEmail(emailData);
// //     console.log("✅ Email sent successfully:", response);
// //     return response;
// //   } catch (error) {
// //     console.error("❌ Error sending email:", error);
// //     throw new Error("Failed to send email");
// //   }
// // }
// // module.exports = { sendBrevoEmail }; 
// import apiInstance from "../config/brevo";
// import { getEmailTemplate } from "../emails/templates";
// import { EmailType } from "../emails/templates/emailTypes";
// export async function sendEmail(to: string, type: EmailType, params: Record<string, any>) {
//   try {
//     const { subject, htmlContent } = getEmailTemplate(type, params);
//     await apiInstance.sendTransacEmail({
//       to: [{ email: to }],
//       subject,
//       htmlContent,
//     });
//     console.log(`Email sent successfully: ${type}`);
//     return { success: true, message: `Email sent: ${type}` };
//   } catch (error:any) {
//     console.error("Error sending email:", error);
//     return { success: false, error: error?.message };
//   }
// }
