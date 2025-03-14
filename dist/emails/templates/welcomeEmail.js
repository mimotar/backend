"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getWelcomeEmail;
function getWelcomeEmail(name) {
    return {
        subject: `Welcome to Mimotar, ${name}!`,
        htmlContent: `<h1>Hi ${name},</h1>
                    <p>Thank you for signing up! We are excited to have you.</p>
                    <p>Enjoy our services.</p>`,
    };
}
