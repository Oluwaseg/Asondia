import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/apiResponse";
import { getRouteParam } from "../../utils/params";
import { tripService } from "./trip.service";

export const startTrip = asyncHandler(async (req: Request, res: Response) => {
  const trip = await tripService.start(req.user!.userId, req.body);
  ApiResponse.created(res, "Trip started successfully", trip);
});

export const endTrip = asyncHandler(async (req: Request, res: Response) => {
  const trip = await tripService.end(getRouteParam(req.params.id), req.user!.userId);
  ApiResponse.success(res, "Trip ended successfully", trip);
});

export const getActiveTrips = asyncHandler(
  async (req: Request, res: Response) => {
    const trips = await tripService.getActive(req.query as never);
    ApiResponse.success(res, "Active trips retrieved", trips, 200, {
      count: trips.length,
    });
  }
);

export const getTrip = asyncHandler(async (req: Request, res: Response) => {
  const trip = await tripService.getById(getRouteParam(req.params.id));
  ApiResponse.success(res, "Trip retrieved", trip);
});

export const updateSeats = asyncHandler(async (req: Request, res: Response) => {
  const trip = await tripService.updateSeats(
    getRouteParam(req.params.id),
    req.user!.userId,
    req.body
  );
  ApiResponse.success(res, "Available seats updated", trip);
});
