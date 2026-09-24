import type { VercelRequest, VercelResponse } from "@vercel/node";
import { HospitalityEventPaymentError, prepareHospitalityEventPayment } from "../../../server/routes/hospitalityEvents.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  return prepareHospitalityEventPayment(req as never, res as never).catch((error) => {
    console.error("Hospitality event session error", error);
    return res.status(error instanceof HospitalityEventPaymentError ? error.status : 400).json({ error: error instanceof Error ? error.message : "Unable to prepare event payment" });
  });
}
