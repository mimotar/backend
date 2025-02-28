"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalError = void 0;
class GlobalError extends Error {
    constructor(message, statusCode, operational) {
        super(message);
        this.name = new.target.name; // Ensures correct class name in case of inheritance
        // Object.setPrototypeOf(this, new.target.prototype);
        this.statusCode = statusCode;
        this.operational = operational;
        Error.captureStackTrace?.(this, this.constructor); // Improves stack trace readability
    }
}
exports.GlobalError = GlobalError;
