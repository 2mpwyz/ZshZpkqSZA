import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifySpecialEventPayment } from "../../../server/routes/specialEvents.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  return verifySpecialEventPayment(req as never, res as never);
}
