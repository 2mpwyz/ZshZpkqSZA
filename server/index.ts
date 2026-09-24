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
  cancelHospitalityEventPayment,
  handleHospitalityEventWebhook,
  prepareHospitalityEventPayment,
  verifyHospitalityEventPayment,
} from "./routes/hospitalityEvents.js";

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
  app.post("/api/payments/hospitality-events/session", prepareHospitalityEventPayment);
  app.post("/api/payments/hospitality-events/verify", verifyHospitalityEventPayment);
  app.post("/api/payments/hospitality-events/cancel", cancelHospitalityEventPayment);
  app.post("/api/payments/hospitality-events/webhook", handleHospitalityEventWebhook);

  return app;
}
