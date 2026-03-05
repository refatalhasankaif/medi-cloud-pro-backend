import { NextFunction, Router, Request, Response } from "express";
import { userController } from "./user.controller";
import z from "zod";
import { Gender } from "../../../generated/prisma/enums";
/*
export interface ICreateDoctorPayload {
    password: string;
    doctor: {
        name: string;
        email: string;
        profilePhoto?: string;
        contactNumber: string;
        address?: string;
        registrationNumber: string;
        experience: number;
        gender: Gender;
        appointmentFee: number;
        currentWorkingPlace: string;
        designation: string;
    }
    specialties: string[];
}
*/
const createDoctorZodSchema = z.object({
    password: z.string(),
    doctor: z.object({
        name: z.string("Name is required and must be a string").min(3, "Name must be at least 3 characters long").max(30, "Name must be less than 30 characters long"),
        email: z.email("Invalid email address"),
        profilePhoto: z.string().optional(),
        contactNumber: z.string("Contact number is required").min(11, "Contact number must be at least 11 digits").max(15, "Contact number must be less than 15 digits") ,
        address: z.string("Address is required").min(10, "Address must be at least 10 characters long").max(90, "Address must be less than 90 characters long" ).optional(),
        registrationNumber: z.string("Registration number is required"),
        experience: z.int("Experience must be a number").nonnegative("Experience cannot be negative"),
        gender: z.enum([Gender.MALE, Gender.FEMALE], "Gender must be either 'MALE' or 'FEMALE'"),
        appointmentFee: z.number("Appointment fee is required").nonnegative("Appointment fee cannot be negative"),
        currentWorkingPlace: z.string("Current working place is required").min(3, "Current working place must be at least 3 characters long").max(50, "Current working place must be less than 50 characters long"),
        designation: z.string("Designation is required").min(3, "Designation must be at least 3 characters long").max(50, "Designation must be less than 50 characters long")
    }),
    specialties: z.array(z.uuid(), "Specialties must be an array of UUIDs").min(1, "At least one specialty is required")
})


const router = Router();

router.post("/create-doctor", (req: Request, res: Response, next: NextFunction) => {
    console.log(req.body)
    
    const parseResult = createDoctorZodSchema.safeParse(req.body);
    if (!parseResult.success) {
        next(parseResult.error);
    }
    req.body = parseResult.data;
    next();
}, userController.createDoctor)
// router.post("/create-admin", userController.createAdmin)
// router.post("/create-superadmin", userController.createSuperAdmin)

export const userRoutes = router;
