"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class socialAuths {
    async googleAuth(req, res) {
        res.send(`
      <a href="/auth/google"> Signup with Google </a>
      <a href="/auth/facebook"> Signup with Facebook </a>
      
      `);
    }
    async demo(req, res) {
        res.send("Here is a demo route");
    }
    async home(req, res) {
        res.send("Welcome home");
    }
    async loginAuth(req, res) {
        res.send(`
     <a href="/auth/google"> Login with Google </a>
     <a href="/auth/facebook"> Login with Facebook </a>
     
     `);
    }
}
exports.default = new socialAuths();
