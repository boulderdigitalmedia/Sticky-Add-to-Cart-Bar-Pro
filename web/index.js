// web/index.js
import express from "express";
import { shopifyApp } from "@shopify/shopify-app-express";
import { BillingInterval } from "@shopify/shopify-api";
import { PrismaClient } from "@prisma/client";

import stickyAnalytics from "./routes/stickyAnalytics.js";
import stickyMetrics from "./routes/stickyMetrics.js";

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

const BILLING_PLAN_NAME = "Sticky Add-to-Cart Bar Pro";
const BILLING_TEST = process.env.SHOPIFY_BILLING_TEST === "true";

/* ============================================
   CLEAN HOST HANDLING
============================================ */
const HOST =
  (process.env.HOST || process.env.SHOPIFY_APP_URL || "")
    .trim()
    .replace(/\/$/, ""); // remove trailing slash

if (!HOST.startsWith("https://")) {
  console.error("❌ HOST must start with https:// (current HOST:", HOST, ")");
}

/* ============================================
   SHOPIFY APP CONFIG
============================================ */
const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    apiVersion: "2024-10",
    scopes: ["read_products", "write_products"],
    hostName: HOST.replace(/^https?:\/\//, "")
  },

  auth: {
    path: "/auth",
    callbackPath: "/auth/callback"
  },

  webhooks: {
    path: "/webhooks"
  },

  // Single recurring plan: $4.99, 30-day interval, 14-day trial
  billing: {
    [BILLING_PLAN_NAME]: {
      amount: 4.99,
      currencyCode: "USD",
      interval: BillingInterval.Every30Days,
      trialDays: 14
    }
  }
});

/* ============================================
   BILLING MIDDLEWARE
============================================ */
async function requireBilling(req, res, next) {
  try {
    const session = res.locals.shopify?.session;
    if (!session) {
      console.error("requireBilling: missing Shopify session");
      return res.status(401).send("Missing Shopify session");
    }

    const plans = [BILLING_PLAN_NAME];

    // ✅ Use shopify.api.billing.* (NOT shopify.billing.*)
    const hasPayment = await shopify.api.billing.check({
      session,
      plans,
      isTest: BILLING_TEST
    });

    if (hasPayment) {
      return next();
    }

    const returnUrl = `${HOST}/?shop=${encodeURIComponent(session.shop)}`;

    const confirmationUrl = await shopify.api.billing.request({
      session,
      plan: BILLING_PLAN_NAME,
      isTest: BILLING_TEST,
      returnUrl
    });

    return res.redirect(confirmationUrl);
  } catch (error) {
    console.error("Billing error:", error?.response?.body || error);
    return res.status(500).send("Billing error");
  }
}

/* ============================================
   EXIT IFRAMES (Firefox / Safari OAuth Fix)
============================================ */
app.get("/exitiframe", (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).send("Missing shop");

  return res.send(`
    <script>
      window.top.location.href = "${HOST}/auth?shop=${encodeURIComponent(shop)}";
    </script>
  `);
});

/* ============================================
   /auth – START OAUTH, HANDLE EMBEDDED FLOW
============================================ */
app.get("/auth", (req, res, next) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).send("Missing shop");

  // If in an embedded context, break out of the iframe first
  const isEmbedded = req.query.embedded === "1";

  if (isEmbedded) {
    return res.redirect(`/exitiframe?shop=${encodeURIComponent(shop)}`);
  }

  return shopify.auth.begin()(req, res, next);
});

/* ============================================
   OAUTH CALLBACK
============================================ */
app.get(
  "/auth/callback",
  shopify.auth.callback(),
  requireBilling,
  (req, res) => {
    const shop = res.locals.shopify.session.shop;
    return res.redirect(`/?shop=${encodeURIComponent(shop)}`);
  }
);

/* ============================================
   PROTECTED API ROUTES
============================================ */
app.use(
  "/api/sticky",
  shopify.validateAuthenticatedSession(),
  requireBilling,
  stickyMetrics
);

/* ============================================
   PUBLIC ANALYTICS ROUTE
============================================ */
app.use("/apps/bdm-sticky-atc", stickyAnalytics);

/* ============================================
   ROOT PAGE (ADMIN APP UI)
============================================ */
app.get(
  "/",
  shopify.validateAuthenticatedSession(),
  requireBilling,
  (_req, res) => {
    res.send("BDM Sticky ATC App Running 🎉");
  }
);

/* ============================================
   START SERVER
============================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});
