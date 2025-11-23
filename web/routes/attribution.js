import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.post("/checkout-attribution", async (req, res) => {
  try {
    const { shop, checkoutToken, productId, variantId, timestamp } = req.body;

    await prisma.stickyAttribution.create({
      data: {
        shop,
        checkoutToken,
        productId,
        variantId,
        timestamp
      }
    });

    res.json({ success: true });

  } catch (err) {
    console.error("Attribution save error:", err);
    res.status(500).json({ error: true });
  }
});

export default router;
