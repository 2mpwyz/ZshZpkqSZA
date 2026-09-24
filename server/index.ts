import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo.js";
import {
  cancelFlutterwavePayment,
  createFlutterwaveHostedSession,
  handleFlutterwaveWebhook,
  verifyFlutterwavePayment,
} from "./routes/flutterwave.js";
import {
  cancelSpecialEventPayment,
  handleSpecialEventWebhook,
  prepareSpecialEventPayment,
  verifySpecialEventPayment,
} from "./routes/specialEvents.js";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  app.get("/api/demo", handleDemo);
  app.post("/api/payments/flutterwave/hosted-session", createFlutterwaveHostedSession);
  app.post("/api/payments/flutterwave/cancel", cancelFlutterwavePayment);
  app.post("/api/payments/flutterwave/verify", verifyFlutterwavePayment);
  app.post("/api/payments/flutterwave/webhook", handleFlutterwaveWebhook);
  app.post("/api/payments/special-events/session", prepareSpecialEventPayment);
  app.post("/api/payments/special-events/verify", verifySpecialEventPayment);
  app.post("/api/payments/special-events/cancel", cancelSpecialEventPayment);
  app.post("/api/payments/special-events/webhook", handleSpecialEventWebhook);

  return app;
}
