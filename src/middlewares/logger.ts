import colors from "colors"
import type { Request, Response , NextFunction } from "express"

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
const white = '\x1b[37m'

const logger = (req:Request, res:Response, next:NextFunction) => {
    const methodColors: Record<HttpMethod, string> = {
        GET: 'green',
        POST: 'blue',
        PUT: 'yellow',
        DELETE: 'red'
    }

    const color: any = methodColors[req.method as HttpMethod] || white

    console.log(
        `${req.method} ${req.protocol}://${req.get("host")}${req.originalUrl}`[
            color
        ],
    )
    next();
};

export default logger