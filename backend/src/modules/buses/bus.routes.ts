import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { Role } from "@prisma/client";
import { createBusSchema } from "./bus.validation";
import { createBus, listBuses, getBus } from "./bus.controller";

const router = Router();

router.get("/", authenticate, listBuses);
router.get("/:id", authenticate, getBus);
router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  validate(createBusSchema),
  createBus
);

export default router;
