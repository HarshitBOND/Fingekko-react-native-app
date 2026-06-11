const express = require("express");
const router = express.Router();
const { Webhook } = require("svix");
const { createUser } = require("../repositories/userRepository");

const svixSecret = process.env.SVIX_SECRET || "dev_svix_secret_for_fallback";

router.post("/", async (req, res) => {
  const headers = req.headers;
  const payload = req.body;

  let event;

  const wh = new Webhook(svixSecret);

  try {
    event = wh.verify(JSON.stringify(payload), headers);
  } catch (err) {
    return res.status(400).send("Invalid webhook event");
  }

  if (event.type === "user.created") {
    const { id, email_addresses, first_name, last_name } = event.data;

    await createUser({
      clerkId: id,
      name: `${first_name || ""} ${last_name || ""}`.trim(),
      email: email_addresses?.[0]?.email_address,
    });
  }

  res.status(200).send("Webhook received");
});

module.exports = router;