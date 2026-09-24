import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cancelHospitalityEventPayment } from "../../../server/routes/hospitalityEvents.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  return cancelHospitalityEventPayment(req as never, res as never);
}
