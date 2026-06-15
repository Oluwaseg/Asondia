import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  startTripSchema,
  updateSeatsSchema,
  activeTripsQuerySchema,
} from "./trip.validation";
import {
  startTrip,
  endTrip,
  getActiveTrips,
  getTrip,
  updateSeats,
} from "./trip.controller";

const router = Router();

router.get(
  "/active",
  validate(activeTripsQuerySchema, "query"),
  getActiveTrips
);
router.get("/:id", getTrip);
router.post(
  "/start",
  authenticate,
  authorize(Role.CONDUCTOR),
  validate(startTripSchema),
  startTrip
);
router.post(
  "/:id/end",
  authenticate,
  authorize(Role.CONDUCTOR),
  endTrip
);
router.put(
  "/:id/seats",
  authenticate,
  authorize(Role.CONDUCTOR),
  validate(updateSeatsSchema),
  updateSeats
);

export default router;
