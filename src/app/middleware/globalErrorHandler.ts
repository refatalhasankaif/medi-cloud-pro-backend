import { NextFunction, Request, Response } from "express";
import { envVars } from "../../config/env";
import status from "http-status";
import z from "zod";
import { TErrorResponce, TErrorSource } from "../interfaces/error.interface";
import { handleZodError } from "../errorHelpers/handelZodError";
import AppError from "../errorHelpers/AppError";

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {

    if (envVars.NODE_ENV === 'development') {
        console.log("Error from global error handler:", err);
    }
    let errorSource: TErrorSource[] = []
    let statusCode: number = status.INTERNAL_SERVER_ERROR;
    let message: string = 'Internel Server Error';
    let stack: string | undefined = undefined

    if (err instanceof z.ZodError) {
        const simplifiedError = handleZodError(err)
        statusCode = simplifiedError.statusCode;
        message = simplifiedError.message;
        errorSource = [...simplifiedError.errorSource];
        stack = err.stack;
    } else if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        stack = err.stack;
        errorSource = [
            {
                path: '',
                message: err.message
            }
        ]
    } else if (err instanceof Error) {
        statusCode = status.INTERNAL_SERVER_ERROR;
        message = err.message;
        stack = err.stack;
        errorSource = [
            {
                path: '',
                message: err.message
            }
        ]
    }

    const errorResponce: TErrorResponce = {
        success: false,
        message: message,
        errorSource,
        stack: envVars.NODE_ENV === 'development' ? stack : undefined,
        error: envVars.NODE_ENV === 'development' ? err : undefined,
    }


    res.status(statusCode).json({ errorResponce })
}