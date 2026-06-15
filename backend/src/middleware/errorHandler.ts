import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError, ApiResponse } from "../utils/apiResponse";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    ApiResponse.error(res, err.message, err.statusCode, err.errors);
    return;
  }

  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    ApiResponse.badRequest(res, "Validation failed", errors);
    return;
  }

  console.error(err);
  ApiResponse.error(res, "Internal server error", 500);
}
