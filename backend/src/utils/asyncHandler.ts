import { RequestHandler } from "express";

type AsyncRequestHandler = (
  ...args: Parameters<RequestHandler>
) => Promise<void>;

export const asyncHandler =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
