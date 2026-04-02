import { UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import status from 'http-status';
import { tokenUtils } from "../../utils/token";
import { IRequestUser } from "../../interfaces/requestUserInterface";
import { envVars } from "../../../config/env";
import { jwtUtils } from "../../utils/jwt";
import { JwtPayload } from "jsonwebtoken";
import { IChangePasswordPayload, ILoginUserPayload, IRegisterPatientPayload } from "./auth.interface";


const registerPatient = async (payload: IRegisterPatientPayload) => {
    const { name, email, password } = payload;

    const data = await auth.api.signUpEmail({
        body: {
            name,
            email,
            password,
        }
    })

    if (!data.user) {
        // throw new Error("Failed to register patient")
        throw new AppError(status.BAD_REQUEST, `Failed to register patient`)
    }

    try {
        const patient = await prisma.$transaction(async (tx) => {

            const patientTx = await tx.patient.create({
                data: {
                    userId: data.user.id,
                    name: payload.name,
                    email: payload.email
                }
            })

            return patientTx;
        })
        const accessToken = tokenUtils.getAccessToken({
            userId: data.user.id,
            role: data.user.role,
            name: data.user.name,
            email: data.user.email,
            status: data.user.status,
            isDelete: data.user.isDeleted,
            emailVerfied: data.user.emailVerified
        });

        const refreshToken = tokenUtils.getRefreshToken({
            userId: data.user.id,
            role: data.user.role,
            name: data.user.name,
            email: data.user.email,
            status: data.user.status,
            isDelete: data.user.isDeleted,
            emailVerfied: data.user.emailVerified
        });

        return {
            ...data,
            accessToken,
            refreshToken,
            patient,
        }

    } catch (error) {
        console.log("Transaction error: ", error);
        await prisma.user.delete({
            where: {
                id: data.user.id
            }
        })
        throw error;
    }
}

const loginUser = async (payload: ILoginUserPayload) => {
    const { email, password } = payload

    const data = await auth.api.signInEmail({
        body: {
            email,
            password
        }
    })

    if (data.user.status === UserStatus.SUSPENDED) {
        // throw new Error("User is suspended")
        throw new AppError(status.FORBIDDEN, `User is suspended`)
    }

    if (data.user.isDeleted) {
        // throw new Error("User is deleted")
        throw new AppError(status.NOT_FOUND, `User is deleted`)
    }

    const accessToken = tokenUtils.getAccessToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        status: data.user.status,
        isDelete: data.user.isDeleted,
        emailVerfied: data.user.emailVerified
    });

    const refreshToken = tokenUtils.getRefreshToken({
        userId: data.user.id,
        role: data.user.role,
        name: data.user.name,
        email: data.user.email,
        status: data.user.status,
        isDelete: data.user.isDeleted,
        emailVerfied: data.user.emailVerified
    });

    return {
        ...data,
        accessToken,
        refreshToken,
    }
}

const getMe = async (user: IRequestUser) => {
    const isUserExist = await prisma.user.findUnique({
        where: {
            id: user.userId,
        },
        include: {
            patient: {
                include: {
                    appointments: true,
                    reviews: true,
                    medicalReports: true,
                    patientHealthData: true,
                }

            },
            doctor: {
                include: {
                    appointments: true,
                    reviews: true,
                    doctorSpecialties: true,
                    prescriptions: true,
                }
            },
            admin: true,
        }
    })

    if (!isUserExist) {
        throw new AppError(status.NOT_FOUND, `User not found`)
    }

    return isUserExist;
}

const getNewToken = async (refreshToken: string, sessionToken: string) => {

    const isSessionTokenExists = await prisma.session.findUnique({
        where: {
            token: sessionToken,
        },
        include: {
            user: true,
        }
    })

    if (!isSessionTokenExists) {
        throw new AppError(status.UNAUTHORIZED, `Invalid session token`);
    }

    const verfiedRefreshToken = jwtUtils.verifyToken(refreshToken, envVars.REFRESH_TOKEN_SECRET)

    if (!verfiedRefreshToken.success && verfiedRefreshToken.error) {
        throw new AppError(status.UNAUTHORIZED, `Invalid refresh token: ${verfiedRefreshToken.error.message}`)
    }

    const data = verfiedRefreshToken.data as JwtPayload

    const newAccessToken = tokenUtils.getAccessToken({
        userId: data.userId,
        role: data.role,
        name: data.name,
        email: data.email,
        status: data.status,
        isDelete: data.isDeleted,
        emailVerfied: data.emailVerified
    });

    const newRefreshToken = tokenUtils.getRefreshToken({
        userId: data.userId,
        role: data.role,
        name: data.name,
        email: data.email,
        status: data.status,
        isDelete: data.isDeleted,
        emailVerfied: data.emailVerified
    });

    const { token } = await prisma.session.update({
        where: {
            token: sessionToken
        },
        data: {
            token: sessionToken,
            expiresAt: new Date(Date.now() + 60 * 60 * 60 * 24 * 1000),
            updatedAt: new Date(),
        }
    })

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        sessionToken: token,
    }
}

const changePassword = async (payload: IChangePasswordPayload, sessionToken: string) => {
    const session = await auth.api.getSession({
        headers: new Headers({
            Authorization: `Bearer ${sessionToken}`
        })
    })

    if (!session) {
        throw new AppError(status.UNAUTHORIZED, `Invalid session token`);
    }

    const { currentPassword, newPassword } = payload

    const result = await auth.api.changePassword({
        body: {
            currentPassword,
            newPassword,
            revokeOtherSessions: true
        },
        headers: new Headers({
            Authorization: `Bearer ${sessionToken}`
        })
    })

    if (session.user.needPasswordChange) {
        await prisma.user.update({
            where: {
                id: session.user.id,
            },
            data: {
                needPasswordChange: false,
            }
        })
    }

    const accessToken = tokenUtils.getAccessToken({
        userId: session.user.id,
        role: session.user.role,
        name: session.user.name,
        email: session.user.email,
        status: session.user.status,
        isDelete: session.user.isDeleted,
        emailVerfied: session.user.emailVerified
    });

    const refreshToken = tokenUtils.getRefreshToken({
        userId: session.user.id,
        role: session.user.role,
        name: session.user.name,
        email: session.user.email,
        status: session.user.status,
        isDelete: session.user.isDeleted,
        emailVerfied: session.user.emailVerified
    });

    return {
        ...result,
        accessToken,
        refreshToken,
    }
}

const logoutUser = async (sessionToken: string) => {
    const result = await auth.api.signOut({
        headers: new Headers({
            Authorization: `Bearer ${sessionToken}`
        })
    })

    return result;
}

const verifyEmail = async (email: string, otp: string) => {
    const result = await auth.api.verifyEmailOTP({
        body: {
            email,
            otp,
        }
    })

    if (result.status && !result.user.emailVerified) {
        await prisma.user.update({
            where: {
                id: result.user.id,
            },
            data: {
                emailVerified: true,
            }
        })
    } else if (!result.status) {
        throw new AppError(status.BAD_REQUEST, `Failed to verify email.`)
    }

    return result;
}

const forgetPassword = async (email: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
    })

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (!user.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email is not verified");
    }

    if (user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED || user.isDeleted === true) {
        throw new AppError(status.BAD_REQUEST, "User account is not active");
    }

    await auth.api.requestPasswordResetEmailOTP({
        body: {
            email,
        }
    });
}

const resetPassword = async (email: string, otp: string, newPassword: string) => {

    const user = await prisma.user.findUnique({
        where: { email },
    })

    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    if (!user.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email is not verified");
    }

    if (user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED || user.isDeleted === true) {
        throw new AppError(status.BAD_REQUEST, "User account is not active");
    }

    await auth.api.resetPasswordEmailOTP({
        body: {
            email,
            otp,
            password: newPassword,
        }
    })

    await prisma.session.deleteMany({
        where: {
            userId: user.id
        }
    })

}

export const authService = {
    registerPatient,
    loginUser,
    getMe,
    getNewToken,
    changePassword,
    logoutUser,
    verifyEmail,
    forgetPassword,
    resetPassword,
}