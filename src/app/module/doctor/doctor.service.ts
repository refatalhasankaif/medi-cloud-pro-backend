import { prisma } from "../../lib/prisma"

const getAllDoctors = async() => {
    const doctors = await prisma.doctor.findMany({
        include: {
            user: true,
            doctorSpecialties: {
                include: {
                    specialty: true
                }
            }
        }
    })
    return doctors;  
}

export const doctorService = {
    getAllDoctors
}