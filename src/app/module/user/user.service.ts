import { Role, Specialty } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ICreateDoctorPayload } from "./user.interface";
import status from 'http-status';

const createDoctor = async (payload: ICreateDoctorPayload) => {
    const specialties: Specialty[] = []
    for (const specialtyId of payload.specialties) {
        const specialty = await prisma.specialty.findUnique({
            where: {
                id: specialtyId
            }
        })
        if (!specialty) {
            // throw new Error(`Specialty with id ${specialtyId} not found`);
         throw new AppError(status.NOT_FOUND, `Specialty with id ${specialtyId} not found`)
        }
        specialties.push(specialty);
    }

    const userExists = await prisma.user.findUnique({
        where: {
            email: payload.doctor.email
        }
    })

    if (userExists) {
        // throw new Error(`User with email already exists`);
        throw new AppError(status.CONFLICT, `User with email already exists`)
    }

    const userDate = await auth.api.signUpEmail({
        body: {
            email: payload.doctor.email,
            password: payload.password,
            role: Role.DOCTOR,
            name: payload.doctor.name,
            needPasswordChange: true
        }
    })

    try {
        const result = await prisma.$transaction(async (tx) => {
            const doctorData = await tx.doctor.create({
                data: {
                    userId: userDate.user.id,
                    ...payload.doctor,
                }
            })

            const doctorSpecialtiesData = specialties.map((specialty) => {
                return {
                    doctorId: doctorData.id,
                    specialtyId: specialty.id
                }
            })

            await tx.doctorSpecialty.createMany({
                data: doctorSpecialtiesData
            })

            const doctor = await tx.doctor.findUnique({
                where: {
                    id: doctorData.id
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    profilePhoto: true,
                    contactNumber: true,
                    address: true,
                    registrationNumber: true,
                    experience: true,
                    gender: true,
                    appointmentFee: true,
                    currentWorkingPlace: true,
                    designation: true,
                    createdAt: true,
                    updatedAt: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                            status: true,
                            emailVerified: true,
                            image: true,
                            isDeleted: true,
                            deletedAt: true,
                            createdAt: true,
                            updatedAt: true
                        }
                    },
                    doctorSpecialties: {
                        select: {
                            specialty: {
                                select: {
                                    title: true,
                                    id: true
                                }
                            }
                        }

                    }
                }
            })
            return doctor;
        })
        return result;
    } catch (error) {
        console.log("Transaction error: ", error);
        await prisma.user.delete({
            where: {
                id: userDate.user.id
            }
        })
        throw error;
    }
}

export const userService = {
    createDoctor,

}