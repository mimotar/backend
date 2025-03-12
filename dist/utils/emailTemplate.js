"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTemplates = void 0;
exports.emailTemplates = {
    welcome: (name) => ({
        subject: "Welcome to Our Platform!",
        html: `<h1>Hello, ${name}!</h1><p>Thank you for signing up. We are excited to have you!</p>`,
    }),
    passwordReset: (name, resetLink) => ({
        subject: "Password Reset Request",
        html: `<h1>Hi ${name},</h1><p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    }),
    orderConfirmation: (name, orderId) => ({
        subject: `Order Confirmation - #${orderId}`,
        html: `<h1>Thank you, ${name}!</h1><p>Your order #${orderId} has been confirmed.</p>`,
    }),
};
