"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emailController_1 = require("../controllers/emailController");
const express = require("express");
const router = express.Router();
router.post("/send-email", emailController_1.sendEmailController);
module.exports = router;
