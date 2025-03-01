"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalError = void 0;
class GlobalError extends Error {
    constructor(name, message, statusCode, operational) {
        super(message);
        this.name = name;
        // this.name = new.target.name; // Ensures correct class name in case of inheritance
        this.statusCode = statusCode;
        this.operational = operational;
        Error.captureStackTrace?.(this, this.constructor); // Improves stack trace readability
    }
}
exports.GlobalError = GlobalError;
