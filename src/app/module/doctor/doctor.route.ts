import { Router } from "express";
import { doctorController } from "./doctor.controller";


const router = Router();

router.get("/", doctorController.getAllDoctors)

export const doctorRoutes = router;
 