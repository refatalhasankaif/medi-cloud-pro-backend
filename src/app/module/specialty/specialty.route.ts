import { Router } from "express";
import { SpecialtyController } from "./specialty.controller";

const router = Router()

router.get('/', SpecialtyController.getAllSpecialties)
router.post('/', SpecialtyController.createSpecialty)
router.patch('/:id', SpecialtyController.updateSpecialty)
router.delete('/:id', SpecialtyController.deleteSpecialty)

export const SpecialtyRoutes = router