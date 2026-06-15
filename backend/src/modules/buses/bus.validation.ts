import { z } from "zod";

export const createBusSchema = z.object({
  busNumber: z.string().min(1, "Bus number is required"),
  plateNumber: z.string().min(1, "Plate number is required"),
  cooperative: z.string().optional().default("AMOEC MPC"),
  capacity: z.coerce.number().int().positive().optional().default(45),
});

export type CreateBusInput = z.infer<typeof createBusSchema>;
