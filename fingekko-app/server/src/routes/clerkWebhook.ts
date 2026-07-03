import express, { Request, Response } from "express";
import { Webhook, WebhookRequiredHeaders } from "svix";

import {
  createUser,
  findByClerkId,
  findByEmail,
  updateById,
  updateByclerkId
} from "../repositories/userRepository.js";

const router = express.Router();

const svixSecret =
  process.env.CLERK_WEBHOOK_SECRET ||
  process.env.SVIX_SECRET ||
  "dev_svix_secret_for_fallback";

interface ClerkUserCreatedEvent {
  type: "user.created";
  data: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email_addresses: { email_address: string }[];
  };
}

interface ClerkWebhookEvent {
  type: string;
  data: unknown;
}

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const headers = req.headers;
    const payload = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : JSON.stringify(req.body);

    const svixId = headers["svix-id"];
    const svixTimestamp = headers["svix-timestamp"];
    const svixSignature = headers["svix-signature"];

    if (
      typeof svixId !== "string" ||
      typeof svixTimestamp !== "string" ||
      typeof svixSignature !== "string"
    ) {
      res.status(400).send("Missing svix headers");
      return;
    }

    const wh = new Webhook(svixSecret);

    const verifyHeaders: WebhookRequiredHeaders = {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    };

    const event = wh.verify(payload, verifyHeaders) as ClerkWebhookEvent;

    if (event.type === "user.created") {
      const { data } = event as ClerkUserCreatedEvent;
      const { id, email_addresses, first_name, last_name } = data;

      const email =
        email_addresses?.[0]?.email_address?.toLowerCase?.() ?? null;
      const name =
        `${first_name || ""} ${last_name || ""}`.trim() ||
        email?.split("@")[0] ||
        "FinGekko User";

      const existingByClerkId = await findByClerkId(id);
      if (existingByClerkId) {
        res.status(200).send("User already exists");
        return;
      }

      if (email) {
        const existingByEmail = await findByEmail(email);
        if (existingByEmail) {
          const existingId =
            (existingByEmail as { id?: string; _id?: string }).id ??
            (existingByEmail as { id?: string; _id?: string })._id;

          await updateById(existingId as string, {
            clerkId: id,
            name ,
            email,
          });

          console.log("User linked to existing email:", email);
          res.status(200).send("User linked");
          return;
        }
      }

      await createUser({
        clerkId: id,
        name,
        email: email || `user_${id}@clerk.local`,
      });

      console.log("User saved to DB");
    }

    res.status(200).send("Webhook received");
  } catch (err: unknown) {
    console.error("Webhook error:", (err as Error).message);
    res.status(400).send("Invalid webhook");
  }
});

export default router;