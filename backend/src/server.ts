import http from "http";
import app from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { createSocketServer } from "./sockets";

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const httpServer = http.createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`Asondia API running on http://localhost:${env.PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
