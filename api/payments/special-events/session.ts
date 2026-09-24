import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SpecialEventPaymentError, prepareSpecialEventPayment } from "../../../server/routes/specialEvents.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  return prepareSpecialEventPayment(req as never, res as never).catch((error) => {
    console.error("Special event session error", error);
    return res.status(error instanceof SpecialEventPaymentError ? error.status : 400).json({ error: error instanceof Error ? error.message : "Unable to prepare event payment" });
  });
}
