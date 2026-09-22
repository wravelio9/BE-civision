import { Request, Response, NextFunction } from "express"
import AuthService from "../service/auth.service.js"

class Controller {

    // Controller @ POST "/upload"
    static async upload (req:Request, res:Response, next:NextFunction) {
        
    }

    // Controller @ GET "/report"
    static async report (req:Request, res:Response, next:NextFunction) {
        try {

        } catch (err) {
            next(err)
        }
    }
}

export default Controller