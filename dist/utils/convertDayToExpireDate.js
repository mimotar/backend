"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertDayToExpireDate = convertDayToExpireDate;
function convertDayToExpireDate(days) {
    const now = new Date();
    now.setDate(now.getDate() + days);
    return now;
}
