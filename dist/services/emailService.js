"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendEmailWithTemplate = sendEmailWithTemplate;
const brevo_1 = __importDefault(require("../config/brevo"));
const env_1 = require("../config/env");
const templates_1 = require("../emails/templates");
const axios_1 = __importDefault(require("axios"));
async function sendEmail(to, type, params) {
    try {
        const { subject, htmlContent } = (0, templates_1.getEmailTemplate)(type, params);
        await brevo_1.default.sendTransacEmail({
            sender: { email: env_1.env.EMAIL },
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
async function sendEmailWithTemplate(to, params, templateId) {
    try {
        const response = await axios_1.default.post('https://api.brevo.com/v3/smtp/email', {
            sender: { email: env_1.env.EMAIL },
            to: [{ email: to }],
            templateId,
            params,
        }, {
            headers: {
                'accept': 'application/json',
                'api-key': env_1.env.BREVO_API_KEY,
                'content-type': 'application/json',
            }
        });
        return { success: true, message: `Email sent` };
    }
    catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error: error?.message };
    }
}
