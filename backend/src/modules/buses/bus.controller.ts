import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/apiResponse";
import { getRouteParam } from "../../utils/params";
import { busService } from "./bus.service";

export const createBus = asyncHandler(async (req: Request, res: Response) => {
  const bus = await busService.create(req.body);
  ApiResponse.created(res, "Bus registered successfully", bus);
});

export const listBuses = asyncHandler(async (_req: Request, res: Response) => {
  const buses = await busService.list();
  ApiResponse.success(res, "Buses retrieved", buses);
});

export const getBus = asyncHandler(async (req: Request, res: Response) => {
  const bus = await busService.getById(getRouteParam(req.params.id));
  ApiResponse.success(res, "Bus retrieved", bus);
});
