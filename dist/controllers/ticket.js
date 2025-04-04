"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ticket = void 0;
const createToken_1 = require("../utils/createToken");
const GlobalErrorHandler_1 = require("../middlewares/error/GlobalErrorHandler");
const verifyToken_1 = __importDefault(require("../utils/verifyToken"));
class Ticket {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async GenerateTicket(req, res, next) {
        const payload = (await req.body);
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            next(new GlobalErrorHandler_1.GlobalError("Unauthorized", "No token provided", 401, true));
            return;
        }
        const token = authHeader.split(" ")[1];
        // console.log(token);
        const user = await (0, verifyToken_1.default)(token);
        console.log(user);
        const transactionToken = await (0, createToken_1.createToken)(172800000, user);
    }
}
exports.Ticket = Ticket;
