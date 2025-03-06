"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailController = sendEmailController;
const emailService_1 = require("../services/emailService");
async function sendEmailController(req, res) {
    const { email, type, params } = req.body;
    if (!email || !type || !params) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    try {
        const result = await (0, emailService_1.sendEmail)(email, type, params);
        if (result.success) {
            return res.status(200).json({ message: result.message });
        }
        else {
            return res.status(500).json({ message: "Error sending email", error: result.error });
        }
    }
    catch (error) {
        return res.status(500).json({ message: "Internal server error", error });
    }
}
