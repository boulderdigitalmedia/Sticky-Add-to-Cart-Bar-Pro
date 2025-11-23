// web/routes/stickyAnalytics.js
import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * POST /apps/bdm-sticky-atc/track
 * Body: { shopDomain, type, productId?, variantId?, quantity? }
 */
router.post("/track", async (req, res) => {
  try {
    const { shopDomain, type, productId, variantId, quantity } = req.body || {};

    if (!shopDomain || !type) {
      return res.status(400).json({ error: "shopDomain and type are required" });
    }

    await prisma.StickyEvent.create({
      data: {
        shopDomain,
        type,
        productId: productId || "",
        variantId: variantId || "",
        quantity: Number.isFinite(Number(quantity)) ? Number(quantity) : 0,
      },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("Sticky analytics track error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
