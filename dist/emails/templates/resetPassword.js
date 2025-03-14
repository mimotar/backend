"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getPasswordResetEmail;
function getPasswordResetEmail(resetLink) {
    return {
        subject: "Password Reset Request",
        htmlContent: `<h1>Password Reset</h1>
                    <p>Click the link below to reset your password:</p>
                    <a href="${resetLink}">Reset Password</a>`,
    };
}
