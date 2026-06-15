import { prisma } from "../../config/database";
import { AppError } from "../../utils/apiResponse";
import { CreateBusInput } from "./bus.validation";

export const busService = {
  async create(input: CreateBusInput) {
    const existing = await prisma.bus.findUnique({
      where: { plateNumber: input.plateNumber },
    });

    if (existing) {
      throw new AppError(409, "A bus with this plate number already exists");
    }

    return prisma.bus.create({ data: input });
  },

  async list() {
    return prisma.bus.findMany({
      where: { isActive: true },
      orderBy: { busNumber: "asc" },
    });
  },

  async getById(id: string) {
    const bus = await prisma.bus.findUnique({ where: { id } });

    if (!bus) {
      throw new AppError(404, "Bus not found");
    }

    return bus;
  },
};
