"use strict";
// import { Request, Response, NextFunction } from 'express';
// import logger from "../../utils/logger";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    // Your error handling logic here
    return res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
};
exports.errorHandler = errorHandler;
