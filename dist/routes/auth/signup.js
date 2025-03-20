"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
// import { socialAuthCallback } from "../../config/Passport";
const socialAuth_1 = __importDefault(require("../../controllers/test/socialAuth"));
const signupRouter = (0, express_1.Router)();
signupRouter.get("/", socialAuth_1.default.googleAuth);
signupRouter.get("/home", socialAuth_1.default.home);
signupRouter.get("/login", socialAuth_1.default.loginAuth);
// Google signup
signupRouter.get("/google", 
// socialAuth.demo
passport_1.default.authenticate("google-signup", { scope: ["email", "profile"] }));
signupRouter.get("/google/verify", passport_1.default.authenticate("google-signup", { failureRedirect: "/login" }), (req, res) => {
    res.redirect("/auth/home");
});
//Google Login
signupRouter.get("/google", passport_1.default.authenticate("google-login", { scope: ["email", "profile"] }));
signupRouter.get("/google/callback", passport_1.default.authenticate("google-login", { failureRedirect: "/login" }), (req, res) => {
    console.log("Google login successful");
    res.redirect("/dashboard");
});
// Facebook signup
signupRouter.get('/facebook', passport_1.default.authenticate('facebook', {
    scope: ['email', 'public_profile']
}));
signupRouter.get('/facebook/callback', passport_1.default.authenticate('facebook', {
    session: false,
    failureRedirect: `/login`
}), (req, res) => {
    console.log("Facebook auth successful, user:", req.user);
    res.redirect("/auth/home");
});
exports.default = signupRouter;
