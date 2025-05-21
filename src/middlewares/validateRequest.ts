import { Transaction } from './../types/user';
import { NextFunction, Request, Response } from 'express';
import { body, ValidationChain, validationResult } from 'express-validator';
import { prisma } from '../config/db';

export const registerValidation: ValidationChain[] = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character')
];

export const loginValidation: ValidationChain[] = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required')
];


export const validateUserRegistrationInput: ValidationChain[] = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required')
]

export const validateOtpResendInput: ValidationChain[] = [
  body('email').isEmail().withMessage("Invalid Email")
]

export const validateOTPVerifyInput:  ValidationChain[] = [
  body('email').isEmail().withMessage("Invalid Email"),
  body('otp').isString().withMessage('OTP is meant to be in a string format').isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 characters long')
]


export const validateLoginWithEmail: ValidationChain[] = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 1 }).withMessage('Password cannot be empty')
    .trim()
    .escape()
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    res.status(400).json({
      status: 400,
      message: 'Validation errors',
      data: error.array(),
      success: false
    });
    return;
  }
  next();
};


