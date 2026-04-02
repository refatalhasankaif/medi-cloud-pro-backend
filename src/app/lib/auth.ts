import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { bearer, emailOTP } from "better-auth/plugins";
import { sendEmail } from "../utils/email";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },

    emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
    },


    user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                defaultValue: Role.PATIENT
            },
            status: {
                type: "string",
                required: true,
                defaultValue: UserStatus.ACTIVE
            },
            needPasswordChange: {
                type: "boolean",
                required: true,
                defaultValue: false
            },
            isDeleted: {
                type: "boolean",
                required: true,
                defaultValue: false
            },
            deletedAt: {
                type: "date",
                required: false,
                defaultValue: null
            }
        }
    },

    plugins: [
        bearer(),
        emailOTP({
            overrideDefaultEmailVerification: true,
            async sendVerificationOTP({ email, otp, type }) {
                if (type === "email-verification") {
                    const user = await prisma.user.findUnique({
                        where: {email},
                    });

                    if (user && !user.emailVerified) {
                        sendEmail({
                            to: email,
                            subject: "Verify your email",
                            templateName: "otp",
                            templateData: {
                                name: user.name,
                                otp,
                                email,
                            }
                        })
                    }
                } else if (type === "forget-password"){
                    const user = await prisma.user.findUnique({
                        where: {
                            email,
                        }
                    })
                    if (user) {
                        sendEmail({
                            to: email,
                            subject: "Reset your password",
                            templateName: "otp",
                            templateData: {
                                name: user.name,
                                otp,
                                email,
                            }
                        }) 
                    }
                }
            },
            expiresIn: 5 * 60, // 5 minutes
            otpLength: 6,

        }),
    ],
    session: {
        expiresIn: 60 * 60 * 60 * 24,
        updateAge: 60 * 60 * 60 * 24,
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60 * 60 * 24,
        }
    }
});