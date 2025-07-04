"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ticket = void 0;
const TicketSchema_1 = require("../zod/TicketSchema");
const createToken_1 = require("../utils/createToken");
const GlobalErrorHandler_1 = require("../middlewares/error/GlobalErrorHandler");
const verifyToken_1 = __importDefault(require("../utils/verifyToken"));
const convertDayToExpireDate_1 = require("../utils/convertDayToExpireDate");
const prisma_1 = __importDefault(require("../utils/prisma"));
class Ticket {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async GenerateTicket(req, res, next) {
        try {
            const data = req.body;
            const payload = {
                amount: data.amount,
                transaction_description: data.transaction_description,
                user_id: data.user_id,
                // status: data.status,
                pay_escrow_fee: data.pay_escrow_fee,
                additional_agreement: data.additional_agreement,
                pay_shipping_cost: data.pay_shipping_cost,
                creator_fullname: data.creator_fullname,
                creator_email: data.creator_email,
                creator_no: data.creator_no,
                creator_address: data.creator_address,
                creator_role: data.creator_role,
                receiver_fullname: data.receiver_fullname,
                reciever_email: data.reciever_email,
                receiver_no: data.receiver_no,
                receiver_address: data.receiver_address,
                reciever_role: data.reciever_role,
                // link_expires: data.link_expires,
                // txn_link: data.txn_link,
                terms: data.terms,
                transactionType: data.transactionType,
                // transactionToken: data.transactionToken,
                expiresAt: data.expiresAt,
                inspection_duration: data.inspection_duration,
                // created_at: data.created_at,
            };
            // const authHeader = req.headers.authorization;
            // if (!authHeader || !authHeader.startsWith("Bearer ")) {
            //   next(new GlobalError("Unauthorized", "No token provided", 401, true));
            //   return;
            // }
            // const token = authHeader.split(" ")[1];
            // //guessing this is the payload format that was used to signed the SIgn/login user token
            // interface tokenSignPayload extends JwtPayload {
            //   userId: string;
            //   email: string;
            // }
            // // console.log(token);
            // const user = await VerifyToken<tokenSignPayload>(token);
            // console.log(user);
            const validateTicket = TicketSchema_1.TransactionSchema.safeParse({
                ...payload,
            });
            if (!validateTicket.success) {
                let error = "";
                const errors = validateTicket.error.format();
                console.log(errors);
                for (let [key, value] of Object.entries(errors)) {
                    // console.log(key, value);
                    if (value &&
                        typeof value === "object" &&
                        "_errors" in value &&
                        Array.isArray(value._errors)) {
                        error += ` ${key} field: ${value._errors[0]},`;
                    }
                }
                next(new GlobalErrorHandler_1.GlobalError("ZodError", String(error), 400, true));
                return;
            }
            const LinkJwtPayload = {
                creator_email: payload.creator_email,
                reciever_email: payload.reciever_email,
            };
            const parseDayToExpireToDate = (0, convertDayToExpireDate_1.convertDayToExpireDate)(payload.expiresAt); //user send 2 (i.e 2day). add 2 to expire Date
            const expiresIn = payload.expiresAt * 24 * 60 * 60 * 1000; // convert to milliseconds
            const transactionToken = await (0, createToken_1.createToken)(expiresIn, LinkJwtPayload);
            const transaction = await prisma_1.default.transaction.create({
                data: {
                    ...payload,
                    transactionToken: transactionToken,
                    txn_link: `${process.env.FRONTEND_URL}/ticket/${transactionToken}`,
                    expiresAt: new Date(parseDayToExpireToDate),
                },
                select: {
                    id: true,
                    receiver_fullname: true,
                    reciever_email: true,
                    receiver_no: true,
                    created_at: true,
                    transactionToken: true,
                    txn_link: true,
                    amount: true,
                    transaction_description: true,
                },
            });
            res.status(200).json({
                message: "Ticket created successfully",
                data: { ...transaction },
            });
            return;
        }
        catch (error) {
            console.log(error);
            if (error instanceof GlobalErrorHandler_1.GlobalError) {
                next(new GlobalErrorHandler_1.GlobalError(error.name, error.message, error.statusCode, error.operational));
                return;
            }
            if (error instanceof Error) {
                next(new GlobalErrorHandler_1.GlobalError(error.name, "Internal server Error", 500, false));
                return;
            }
            next(new GlobalErrorHandler_1.GlobalError("UnknownError", "Internal server Error", 500, false));
            return;
        }
    }
    async approveTicket(req, res, next) {
        try {
            const body = req.body;
            const bodyObj = {
                ticket_id: body.ticketId,
                ticket_token: body.ticketToken,
                creator_email: body.creatorEmail,
                reciever_email: body.recieverEmail,
            };
            //check if link has expires
            const verifyLinkDecoded = await (0, verifyToken_1.default)(bodyObj.ticket_token);
            if (!verifyLinkDecoded) {
                next(new GlobalErrorHandler_1.GlobalError("ExpiresInvalidToken", "The token has expired or is invalid", 401, true));
                return;
            }
            // console.log(bodyObj, body);
            // optional:check the token is in db
            const ticket = await prisma_1.default.transaction.findFirst({
                where: {
                    transactionToken: bodyObj.ticket_token,
                },
            });
            if (!ticket) {
                next(new GlobalErrorHandler_1.GlobalError("NotFound", "The token not found in db", 404, true));
                return;
            }
            // aprrove
            await prisma_1.default.transaction.update({
                where: {
                    id: bodyObj.ticket_id,
                },
                data: {
                    approveStatus: true,
                },
            });
            console.log("approved");
            res.status(200).json({
                message: "Ticket approve successfully",
            });
            return;
        }
        catch (error) {
            if (error instanceof GlobalErrorHandler_1.GlobalError) {
                next(new GlobalErrorHandler_1.GlobalError(error.name, error.message, error.statusCode, error.operational));
                return;
            }
            if (error instanceof Error) {
                next(new GlobalErrorHandler_1.GlobalError(error.name, "Internal server Error", 500, false));
                return;
            }
            next(new GlobalErrorHandler_1.GlobalError("UnknownError", "Internal server Error", 500, false));
            return;
        }
    }
}
exports.Ticket = Ticket;
