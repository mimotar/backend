"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emailController_1 = require("../controllers/emailController");
const express = require("express");
const emailRouter = express.Router();
emailRouter.post("/send-email", emailController_1.sendEmailController);
exports.default = emailRouter;
