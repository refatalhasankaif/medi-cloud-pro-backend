import { catchAsync } from "../../shared/catchAsync";
import { Request, Response } from "express";
import { sendResponce } from "../../shared/sendResponce";
import status from "http-status";
import { doctorService } from "./doctor.service";

const getAllDoctors = catchAsync(
    async (req: Request, res: Response) => {
        const result = await doctorService.getAllDoctors();
        sendResponce(res, {
            httpStatuscode: status.OK,
            success: true,
            message: "Doctors retrieved successfully",
            data: result
        })
    }
)

export const doctorController = {
    getAllDoctors
}
