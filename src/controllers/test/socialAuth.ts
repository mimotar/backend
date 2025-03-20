import { Request, Response } from "express";

class socialAuths  {
 async googleAuth(req:Request,res: Response){
    res.send(`
      <a href="/auth/google"> Signup with Google </a>
      <a href="/auth/facebook"> Signup with Facebook </a>
      
      `)
 }
 async demo(req:Request, res:Response){
    res.send("Here is a demo route")
 }
 async home(req:Request, res:Response){
    res.send("Welcome home")
 }

 async loginAuth(req:Request,res: Response){
   res.send(`
     <a href="/auth/google"> Login with Google </a>
     <a href="/auth/facebook"> Login with Facebook </a>
     
     `)
}
}

export default new socialAuths();