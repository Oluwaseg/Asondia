import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { registerTrackingSockets } from "./tracking.socket";

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
      methods: ["GET", "POST"],
    },
  });

  registerTrackingSockets(io);

  return io;
}
