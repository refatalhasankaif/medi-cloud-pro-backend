import { Router } from "express";
import { SpecialtyRoutes } from "../module/specialty/specialty.route";

const router = Router()
router.use('/specialties', SpecialtyRoutes)

export const IndexRoutes = router;