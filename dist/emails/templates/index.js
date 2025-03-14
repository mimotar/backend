"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmailTemplate = getEmailTemplate;
const emailTypes_1 = require("./emailTypes");
const resetPassword_1 = __importDefault(require("./resetPassword"));
const welcomeEmail_1 = __importDefault(require("./welcomeEmail"));
function getEmailTemplate(type, params) {
    switch (type) {
        case emailTypes_1.EmailType.WELCOME:
            return (0, welcomeEmail_1.default)(params.name);
        case emailTypes_1.EmailType.PASSWORD_RESET:
            return (0, resetPassword_1.default)(params.resetLink);
        default:
            throw new Error("Invalid email type");
    }
}
