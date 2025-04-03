"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailController = void 0;
const emailService_1 = require("../../services/emailService");
class emailControllers {
    async welcome(req, res) {
        (0, emailService_1.sendEmailWithTemplate)('kcblack22@gmail.com', { firstname: 'Agu!', link: '' }, 1);
        res.send('Email sent');
    }
}
exports.EmailController = new emailControllers();
