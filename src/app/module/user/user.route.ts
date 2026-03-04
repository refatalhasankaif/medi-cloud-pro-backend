import { Router } from "express";
import { userController } from "./user.controller";

const router = Router();

router.post("/create-doctor", userController.createDoctor)
// router.post("/create-admin", userController.createAdmin)
// router.post("/create-superadmin", userController.createSuperAdmin)

export const userRoutes = router;
 