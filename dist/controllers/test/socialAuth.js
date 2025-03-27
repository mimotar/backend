"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class socialAuths {
    async googleAuth(req, res) {
        res.send(`
      <a href="/auth/signup/google"> Signup with Google </a>
      <a href="/auth/facebook"> Signup with Facebook </a>
      
      `);
    }
    async demo(req, res) {
        res.send("Here is a demo route");
    }
    async home(req, res) {
        res.send("Welcome home");
    }
    async dashboard(req, res) {
        res.send("Welcome to your dashboard");
    }
    async loginAuth(req, res) {
        res.send(`
     <a href="/auth/login/google"> Login with Google </a>
     <a href="/auth/facebook"> Login with Facebook </a>
     
     `);
    }
}
exports.default = new socialAuths();
