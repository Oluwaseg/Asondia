import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import busRoutes from "./modules/buses/bus.routes";
import tripRoutes from "./modules/trips/trip.routes";
import { ApiResponse } from "./utils/apiResponse";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
  })
);
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  ApiResponse.success(res, "Asondia API is running", {
    status: "ok",
    environment: env.NODE_ENV,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/trips", tripRoutes);

app.use((_req, res) => {
  ApiResponse.notFound(res, "Route not found");
});

app.use(errorHandler);

export default app;
