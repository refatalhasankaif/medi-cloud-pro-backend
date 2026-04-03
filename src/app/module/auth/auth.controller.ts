import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponce } from "../../shared/sendResponce";
import { Request, Response } from "express";
import { tokenUtils } from "../../utils/token";
import { authService } from "./auth.service";
import AppError from "../../errorHelpers/AppError";
import { cookieUtils } from "../../utils/cookie";
import { envVars } from "../../../config/env";
import { auth } from "../../lib/auth";

const registerPatient = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;

        const result = await authService.registerPatient(payload)

        const { accessToken, refreshToken, token, ...rest } = result

        tokenUtils.setAccessTokenCookie(res, accessToken)
        tokenUtils.setRefreshTokenCookie(res, refreshToken)
        tokenUtils.setBetterAuthSessionCookie(res, token as string)


        sendResponce(res, {
            httpStatuscode: status.CREATED,
            success: true,
            message: "Patient registered successfully",
            data: {
                token,
                accessToken,
                refreshToken,
                ...rest,
            }

        })
    }
)

const loginUser = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body;
        const result = await authService.loginUser(payload)

        const { accessToken, refreshToken, token, ...rest } = result

        tokenUtils.setAccessTokenCookie(res, accessToken)
        tokenUtils.setRefreshTokenCookie(res, refreshToken)
        tokenUtils.setBetterAuthSessionCookie(res, token)


        sendResponce(res, {
            httpStatuscode: status.OK,
            success: true,
            message: "User logged in successfully",
            data: {
                token,
                accessToken,
                refreshToken,
                ...rest,
            }
        })
    }
)

const getMe = catchAsync(
    async (req: Request, res: Response) => {
        const user = req.user

        const data = await authService.getMe(user)
        sendResponce(res, {
            httpStatuscode: status.OK,
            success: true,
            message: "User data fetched successfully",
            data
        })
    }
)

const getNewToken = catchAsync(
    async (req: Request, res: Response) => {

        const refreshToken = req.cookies.refreshToken
        const betterAuthSessionToken = req.cookies['better-auth.session.session_token']

        if (!refreshToken) {
            throw new AppError(status.UNAUTHORIZED, "Refresh token is missing")
        }

        const result = await authService.getNewToken(refreshToken, betterAuthSessionToken)

        const { accessToken, refreshToken: newRefreshToken, sessionToken, ...rest } = result

        tokenUtils.setAccessTokenCookie(res, accessToken)
        tokenUtils.setRefreshTokenCookie(res, newRefreshToken)
        tokenUtils.setBetterAuthSessionCookie(res, sessionToken)

        sendResponce(res, {
            httpStatuscode: status.OK,
            success: true,
            message: "New access token generated successfully",
            data: {
                accessToken,
                refreshToken: newRefreshToken,
                sessionToken,
                ...rest,
            }
        })
    }
)

const changePassword = catchAsync(
    async (req: Request, res: Response) => {
        const payload = req.body
        const betterAuthSessionToken = req.cookies['better-auth.session.session_token']

        const result = await authService.changePassword(payload, betterAuthSessionToken)

        const { accessToken, refreshToken, token } = result

        tokenUtils.setAccessTokenCookie(res, accessToken)
        tokenUtils.setRefreshTokenCookie(res, refreshToken)
        tokenUtils.setBetterAuthSessionCookie(res, token as string)

        sendResponce(res, {
            httpStatuscode: status.OK,
            success: true,
            message: "Password changed successfully",
            data: result
        })
    }
)

const logOutUser = catchAsync(
    async (req: Request, res: Response) => {
        const betterAuthSessionToken = req.cookies['better-auth.session.session_token']
        const result = await authService.logoutUser(betterAuthSessionToken)

        cookieUtils.clearCookie(res, 'accessToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
        })

        cookieUtils.clearCookie(res, 'refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
        })

        cookieUtils.clearCookie(res, 'better-auth.session.session_token', {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
        })

        sendResponce(res, {
            httpStatuscode: status.OK,
            success: true,
            message: "User logged out successfully",
            data: result
        })

    }
)

const verifyEmail = catchAsync(
    async (req: Request, res: Response) => {
        const { email, otp } = req.body;
        await authService.verifyEmail(email, otp)

        sendResponce(res, {
            httpStatuscode: status.OK,
            success: true,
            message: "Email verified successfully",
        })
    }
)

const forgetPassword = catchAsync(
    async (req: Request, res: Response) => {
        const { email } = req.body;
        await authService.forgetPassword(email)

        sendResponce(res, {
            httpStatuscode: status.OK,
            success: true,
            message: "Password reset instructions sent to email",
        })
    }
)

const resetPassword = catchAsync(
    async (req: Request, res: Response) => {
        const { email, otp, newPassword } = req.body;
        await authService.resetPassword(email, otp, newPassword)

        sendResponce(res, {
            httpStatuscode: status.OK,
            success: true,
            message: "Password reset successfully",
        })
    }
)

// /api/v1/auth/login/google?redirect=/profile
const googleLogin = catchAsync(
    async (req: Request, res: Response) => {

        const redirectPath = req.query.redirect || '/';
        const encodedRedirectPath = encodeURIComponent(redirectPath as string)
        const callbackURL = `${envVars.BETTER_AUTH_URL}/api/v1/auth/google/success?redirect=${encodedRedirectPath}`

        res.render("googleRedirect", {
            callbackURL: callbackURL,
            betterAuthUrl: envVars.BETTER_AUTH_URL,
        })
    }
)

const googleLoginSuccess = catchAsync(
    async (req: Request, res: Response) => {

        const redirectPath = req.query.redirect as string || '/';
        const sessionToken = req.cookies["better-auth.session_token"]

        if (!sessionToken) {
            return res.redirect(`${envVars.FRONTEND_URL}/login?error=oauth_failed`)
        }

        const session = await auth.api.getSession({
            headers: {
                "Cookie": `better-auth.session_token=${sessionToken}`
            }
        })

        if (!session) {
            return res.redirect(`${envVars.FRONTEND_URL}/login?error=no_session_found`)
        }

        if (session && !session.user) {
            return res.redirect(`${envVars.FRONTEND_URL}/login?error=no_user_found`)
        }

        const result = await authService.googleLoginSuccess(session)
        const { accessToken, refreshToken } = result;

        tokenUtils.setAccessTokenCookie(res, accessToken)
        tokenUtils.setRefreshTokenCookie(res, refreshToken)

        const isValidRedirectPath = redirectPath.startsWith("/") && !redirectPath.startsWith("//")
        const finalRedirectPat = isValidRedirectPath ? redirectPath : "/dashboard"

        res.redirect(`${envVars.FRONTEND_URL}${finalRedirectPat}`)
    }
)

const googleLoginFailure = catchAsync(
    async (req: Request, res: Response) => {
        const error = req.query.error as string || "oauth_failed";
        res.redirect(`${envVars.FRONTEND_URL}/login?error=${error}`)
     }
)


export const AuthController = {
    registerPatient,
    loginUser,
    getMe,
    getNewToken,
    changePassword,
    logOutUser,
    verifyEmail,
    forgetPassword,
    resetPassword,
    googleLogin,
    googleLoginSuccess,
    googleLoginFailure
}