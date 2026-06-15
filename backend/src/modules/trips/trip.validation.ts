import { z } from "zod";

export const startTripSchema = z.object({
  busId: z.string().min(1, "Bus ID is required"),
  routeStart: z.string().min(1, "Route start is required"),
  routeEnd: z.string().min(1, "Route end is required"),
  availableSeats: z.coerce.number().int().min(0).optional(),
});

export const updateSeatsSchema = z.object({
  availableSeats: z.coerce.number().int().min(0),
});

export const activeTripsQuerySchema = z.object({
  routeStart: z.string().optional(),
  routeEnd: z.string().optional(),
});

export type StartTripInput = z.infer<typeof startTripSchema>;
export type UpdateSeatsInput = z.infer<typeof updateSeatsSchema>;
export type ActiveTripsQuery = z.infer<typeof activeTripsQuerySchema>;
