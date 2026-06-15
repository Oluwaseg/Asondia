import { TripStatus } from "@prisma/client";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/apiResponse";
import {
  ActiveTripsQuery,
  StartTripInput,
  UpdateSeatsInput,
} from "./trip.validation";

const tripInclude = {
  bus: {
    select: {
      id: true,
      busNumber: true,
      plateNumber: true,
      cooperative: true,
      capacity: true,
    },
  },
  conductor: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

export const tripService = {
  async start(conductorId: string, input: StartTripInput) {
    const bus = await prisma.bus.findUnique({ where: { id: input.busId } });

    if (!bus || !bus.isActive) {
      throw new AppError(404, "Bus not found or inactive");
    }

    const existingActive = await prisma.trip.findFirst({
      where: {
        busId: input.busId,
        status: TripStatus.ACTIVE,
      },
    });

    if (existingActive) {
      throw new AppError(409, "This bus already has an active trip");
    }

    const conductorActive = await prisma.trip.findFirst({
      where: {
        conductorId,
        status: TripStatus.ACTIVE,
      },
    });

    if (conductorActive) {
      throw new AppError(409, "You already have an active trip");
    }

    const availableSeats = input.availableSeats ?? bus.capacity;

    return prisma.trip.create({
      data: {
        busId: input.busId,
        conductorId,
        routeStart: input.routeStart,
        routeEnd: input.routeEnd,
        availableSeats,
        status: TripStatus.ACTIVE,
      },
      include: tripInclude,
    });
  },

  async end(tripId: string, conductorId: string) {
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });

    if (!trip) {
      throw new AppError(404, "Trip not found");
    }

    if (trip.conductorId !== conductorId) {
      throw new AppError(403, "You can only end your own trip");
    }

    if (trip.status !== TripStatus.ACTIVE) {
      throw new AppError(400, "Trip is not active");
    }

    return prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.COMPLETED,
        endedAt: new Date(),
      },
      include: tripInclude,
    });
  },

  async getActive(query: ActiveTripsQuery = {}) {
    return prisma.trip.findMany({
      where: {
        status: TripStatus.ACTIVE,
        ...(query.routeStart && { routeStart: query.routeStart }),
        ...(query.routeEnd && { routeEnd: query.routeEnd }),
      },
      include: tripInclude,
      orderBy: { startedAt: "desc" },
    });
  },

  async getById(tripId: string) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: tripInclude,
    });

    if (!trip) {
      throw new AppError(404, "Trip not found");
    }

    return trip;
  },

  async updateSeats(
    tripId: string,
    conductorId: string,
    input: UpdateSeatsInput
  ) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { bus: true },
    });

    if (!trip) {
      throw new AppError(404, "Trip not found");
    }

    if (trip.conductorId !== conductorId) {
      throw new AppError(403, "You can only update seats on your own trip");
    }

    if (trip.status !== TripStatus.ACTIVE) {
      throw new AppError(400, "Trip is not active");
    }

    if (input.availableSeats > trip.bus.capacity) {
      throw new AppError(
        400,
        `Available seats cannot exceed bus capacity (${trip.bus.capacity})`
      );
    }

    return prisma.trip.update({
      where: { id: tripId },
      data: { availableSeats: input.availableSeats },
      include: tripInclude,
    });
  },
};
