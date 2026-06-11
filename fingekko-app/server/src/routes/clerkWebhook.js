const express = require("express");
const router = express.Router();
const { Webhook } = require("svix");

const {
  createUser,
  findByClerkId,
  findByEmail,
  updateById,
} = require("../repositories/userRepository");

const svixSecret =
  process.env.CLERK_WEBHOOK_SECRET || process.env.SVIX_SECRET || "dev_svix_secret_for_fallback";

router.post("/", async (req, res) => {
  try {
    const headers = req.headers;
    const payload = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;

    const wh = new Webhook(svixSecret);

    const event = wh.verify(payload, {
      "svix-id": headers["svix-id"],
      "svix-timestamp": headers["svix-timestamp"],
      "svix-signature": headers["svix-signature"],
    });

    if (event.type === "user.created") {
      const { id, email_addresses, first_name, last_name } = event.data;
      const email = email_addresses?.[0]?.email_address?.toLowerCase?.() ?? null;
      const name = `${first_name || ""} ${last_name || ""}`.trim() || email?.split("@")[0] || "FinGekko User";

      const existingByClerkId = await findByClerkId(id);
      if (existingByClerkId) return res.status(200).send("User already exists");

      if (email) {
        const existingByEmail = await findByEmail(email);
        if (existingByEmail) {
          await updateById(existingByEmail.id ?? existingByEmail._id, {
            clerkId: id,
            name: name || existingByEmail.name,
            email,
          });

          console.log("User linked to existing email:", email);
          return res.status(200).send("User linked");
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
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(400).send("Invalid webhook");
  }
});

module.exports = router;