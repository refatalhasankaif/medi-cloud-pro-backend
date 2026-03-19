import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponce } from "../../shared/sendResponce";
import { authService } from "./auth.service";
import { Request, Response } from "express";
import { tokenUtils } from "../../utils/token";

const registerPatient = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;

        const result = await authService.registerPatient(payload)

        const { accessToken, refreshToken, token, ...rest } = result

        tokenUtils.setAccessTokenCookie(res, accessToken)
        tokenUtils.setRefreshTokenCookie(res, refreshToken)
        tokenUtils.setBetterAuthSessionCookie(res, token)

        sendResponce(res, {
            httpStatuscode: status.CREATED,
            success: true,
            message: "Patient registered successfully",
            data: result
        })
    }
)

const loginUser = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;
        const result = await authService.loginUser(payload)
        sendResponce(res, {
            httpStatuscode: status.OK,
            success: true,
            message: "User logged in successfully",
            data: result
        })
    }
)
export const AuthController = {
    registerPatient,
    loginUser,

}