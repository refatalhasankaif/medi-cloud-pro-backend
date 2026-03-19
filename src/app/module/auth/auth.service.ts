import { UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import status from 'http-status';
import { tokenUtils } from "../../utils/token";

interface IRegisterPatientPayload {
    name: string;
    email: string;
    password: string;
}
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

        return {
            ...data,
            patient
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

const loginUser = async (payload: IRegisterPatientPayload) => {
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

export const authService = {
    registerPatient,
    loginUser

}