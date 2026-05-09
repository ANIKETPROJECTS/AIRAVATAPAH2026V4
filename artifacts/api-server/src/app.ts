import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({
  origin: true,
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204,
}));
app.options("/{*path}", cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

// In development: proxy Expo Metro dev server (Kisan Seva farmer app) through /kisan-seva
if (process.env.NODE_ENV !== "production") {
  const METRO = "http://localhost:8099";
  const metaProxy = createProxyMiddleware({ target: METRO, changeOrigin: true, ws: true });
  const slowProxyOpts = { target: METRO, changeOrigin: true, ws: true, proxyTimeout: 60000, timeout: 60000 };
  app.use("/kisan-seva", createProxyMiddleware({
    ...slowProxyOpts,
    pathRewrite: { "^/kisan-seva": "" },
  }));
  // Expo Metro serves bundles at /_expo and static assets at /assets
  app.use("/_expo", createProxyMiddleware(slowProxyOpts));
  app.use("/assets", createProxyMiddleware(slowProxyOpts));
}

// In production: serve the built React frontend from the same port (single-port deployment)
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const staticDir = path.resolve(__dirname, "..", "..", "agri-admin", "dist", "public");
  app.use(express.static(staticDir));
  app.get("*splat", (_req: Request, res: Response) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";
  const status =
    err != null && typeof err === "object" && "status" in err
      ? (err as { status: number }).status
      : 500;
  logger.error({ err }, "Unhandled error");
  res.status(status).json({ error: message });
});

export default app;
