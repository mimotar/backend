import { body, ValidationChain } from "express-validator";


export const validateDisputeCreateInput: ValidationChain[] = [
    body('transactionId')
        .notEmpty().withMessage('Transaction ID is required')
        .isString().withMessage('Transaction ID must be a string')
        .trim()
        .escape(),

    body('reason')
        .notEmpty().withMessage('Reason is required')
        .isString().withMessage('Reason must be a string')
        .isLength({ min: 10 }).withMessage('Reason must be at least 10 characters long')
        .trim()
        .escape(),

    body('description')
        .optional()
        .isString().withMessage('Description must be a string')
        .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
        .trim()
        .escape(),

    body('resolutionOption')
        .optional()
        .isString().withMessage('Resolution option must be a string')
        .isIn(['refund', 'replacement', 'compensation', 'other']).withMessage('Invalid resolution option')
        .trim()
        .escape()
];