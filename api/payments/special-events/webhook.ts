import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleSpecialEventWebhook } from "../../../server/routes/specialEvents.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  return handleSpecialEventWebhook(req as never, res as never);
}
