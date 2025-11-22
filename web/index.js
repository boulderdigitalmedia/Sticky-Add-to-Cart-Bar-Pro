import express from "express";
import { shopifyApp } from "@shopify/shopify-app-express";
import { BillingInterval } from "@shopify/shopify-api";
import { PrismaClient } from "@prisma/client";
import stickyAnalytics from "./routes/stickyAnalytics.js";
import stickyMetrics from "./routes/stickyMetrics.js";

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

/* ============================================
   SHOPIFY APP + BILLING CONFIG (Correct Format)
   ============================================ */

const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    apiVersion: "2024-10",
    scopes: ["read_products", "write_products"],
    hostName: process.env.HOST.replace(/https?:\/\//, "")
  },

  auth: {
    path: "/auth",
    callbackPath: "/auth/callback"
  },

  webhooks: {
    path: "/webhooks"
  },

  // ⭐ CORRECT BILLING FORMAT (1 paid plan, 14-day trial)
  billing: {
    required: true,
    plans: [
      {
        id: "sticky_atc_pro",          // must be lowercase & no spaces
        price: 4.99,
        trialDays: 14,
        currencyCode: "USD",
        interval: BillingInterval.Every30Days
      }
    ]
  }
});

/* ============================================
   AUTH ROUTES
   ============================================ */

app.get("/auth", shopify.auth.begin());

app.get(
  "/auth/callback",
  shopify.auth.callback(),

  // ⭐ Require billing immediately after authentication
  shopify.billing.require({
    plans: ["sticky_atc_pro"],
  }),

  async (req, res) => {
    const { shop } = req.query;
    res.redirect(`/?shop=${shop}`);
  }
);

/* ============================================
   PROTECTED API ROUTES
   ============================================ */

app.use(
  "/api/sticky",
  shopify.validateAuthenticatedSession(),
  shopify.billing.require({ plans: ["sticky_atc_pro"] }),
  stickyMetrics
);

/* ============================================
   ANALYTICS ROUTES (public)
   ============================================ */

app.use("/apps/bdm-sticky-atc", stickyAnalytics);

/* ============================================
   ROOT PAGE (Admin Dashboard)
   ============================================ */

app.get(
  "/",
  shopify.validateAuthenticatedSession(),
  shopify.billing.require({ plans: ["sticky_atc_pro"] }),
  (_req, res) => res.send("BDM Sticky ATC App Running 🎉")
);

/* ============================================
   START SERVER
   ============================================ */

app.listen(process.env.PORT || 3000, () => {
  console.log("App running on port 3000");
});
