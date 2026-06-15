import { Response } from "express";

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiResponseBody<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  meta?: Record<string, unknown> | null;
  errors?: ApiErrorDetail[];
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: ApiErrorDetail[]
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ApiResponse = {
  success<T>(
    res: Response,
    message: string,
    data: T | null = null,
    statusCode = 200,
    meta?: Record<string, unknown> | null
  ): Response {
    const body: ApiResponseBody<T> = {
      success: true,
      message,
      data,
      meta: meta ?? null,
    };
    return res.status(statusCode).json(body);
  },

  created<T>(res: Response, message: string, data: T): Response {
    return ApiResponse.success(res, message, data, 201);
  },

  error(
    res: Response,
    message: string,
    statusCode = 500,
    errors?: ApiErrorDetail[]
  ): Response {
    const body: ApiResponseBody = {
      success: false,
      message,
      data: null,
      errors,
    };
    return res.status(statusCode).json(body);
  },

  badRequest(res: Response, message: string, errors?: ApiErrorDetail[]): Response {
    return ApiResponse.error(res, message, 400, errors);
  },

  unauthorized(res: Response, message = "Unauthorized"): Response {
    return ApiResponse.error(res, message, 401);
  },

  forbidden(res: Response, message = "Forbidden"): Response {
    return ApiResponse.error(res, message, 403);
  },

  notFound(res: Response, message = "Resource not found"): Response {
    return ApiResponse.error(res, message, 404);
  },
};
