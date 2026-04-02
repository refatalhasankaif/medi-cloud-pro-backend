import { Router } from "express";
import { AuthController } from "./auth.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router()

router.post("/register", AuthController.registerPatient)
router.post("/login", AuthController.loginUser)
router.get("/me", checkAuth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT), AuthController.getMe)
router.post("/refresh-token", AuthController.getNewToken)
router.post("/change-password", checkAuth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT), AuthController.changePassword)
router.post("/logout", checkAuth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT), AuthController.logOutUser)
router.post('/verify-email', AuthController.verifyEmail)
router.post('/forget-password', AuthController.forgetPassword)
router.post('/reset-password', AuthController.resetPassword)

export const AuthRoutes = router;