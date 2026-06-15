import { TripStatus } from "@prisma/client";
import { Server } from "socket.io";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { verifySocketToken } from "../middleware/auth";

const lastDbWrite = new Map<string, number>();

export interface LocationUpdatePayload {
  tripId: string;
  lat: number;
  lng: number;
}

export function tripRoom(tripId: string): string {
  return `trip:${tripId}`;
}

export const trackingService = {
  async updateLocation(
    conductorId: string,
    payload: LocationUpdatePayload,
    io: Server
  ) {
    const { tripId, lat, lng } = payload;

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });

    if (!trip) {
      throw new Error("Trip not found");
    }

    if (trip.conductorId !== conductorId) {
      throw new Error("You can only update location for your own trip");
    }

    if (trip.status !== TripStatus.ACTIVE) {
      throw new Error("Trip is not active");
    }

    const now = Date.now();
    const lastWrite = lastDbWrite.get(tripId) ?? 0;
    const shouldPersist = now - lastWrite >= env.LOCATION_DB_THROTTLE_MS;

    const updatedAt = new Date();

    if (shouldPersist) {
      await prisma.$transaction([
        prisma.trip.update({
          where: { id: tripId },
          data: {
            currentLat: lat,
            currentLng: lng,
            locationUpdatedAt: updatedAt,
          },
        }),
        prisma.locationHistory.create({
          data: { tripId, lat, lng, recordedAt: updatedAt },
        }),
      ]);
      lastDbWrite.set(tripId, now);
    }

    const broadcast = {
      tripId,
      lat,
      lng,
      updatedAt: updatedAt.toISOString(),
      persisted: shouldPersist,
    };

    io.to(tripRoom(tripId)).emit("bus_location_updated", broadcast);

    return broadcast;
  },
};

export function registerTrackingSockets(io: Server): void {
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization?.replace("Bearer ", "") as
        | string
        | undefined);

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const user = verifySocketToken(token);

    if (!user) {
      return next(new Error("Invalid or expired token"));
    }

    socket.data.user = user;
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;

    socket.on("join_trip", async ({ tripId }: { tripId: string }) => {
      if (!tripId) {
        socket.emit("error", { message: "tripId is required" });
        return;
      }

      const trip = await prisma.trip.findUnique({ where: { id: tripId } });

      if (!trip) {
        socket.emit("error", { message: "Trip not found" });
        return;
      }

      await socket.join(tripRoom(tripId));
      socket.emit("joined_trip", { tripId, room: tripRoom(tripId) });

      if (trip.currentLat != null && trip.currentLng != null) {
        socket.emit("bus_location_updated", {
          tripId,
          lat: trip.currentLat,
          lng: trip.currentLng,
          updatedAt: trip.locationUpdatedAt?.toISOString() ?? null,
          persisted: true,
        });
      }
    });

    socket.on(
      "update_location",
      async (payload: LocationUpdatePayload, callback) => {
        if (user.role !== "CONDUCTOR") {
          const err = { message: "Only conductors can update location" };
          socket.emit("error", err);
          callback?.({ success: false, ...err });
          return;
        }

        try {
          const result = await trackingService.updateLocation(
            user.userId,
            payload,
            io
          );
          callback?.({ success: true, data: result });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Location update failed";
          socket.emit("error", { message });
          callback?.({ success: false, message });
        }
      }
    );

    socket.on("leave_trip", async ({ tripId }: { tripId: string }) => {
      if (tripId) {
        await socket.leave(tripRoom(tripId));
        socket.emit("left_trip", { tripId });
      }
    });
  });
}
