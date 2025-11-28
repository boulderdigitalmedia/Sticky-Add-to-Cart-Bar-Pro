// web/index.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import serveStatic from "serve-static";

import { shopifyApp } from "@shopify/shopify-app-express";
import { BillingInterval, LATEST_API_VERSION } from "@shopify/shopify-api";

import { PrismaClient } from "@prisma/client";

import stickyAnalytics from "./routes/stickyAnalytics.js";
import stickyMetrics from "./routes/stickyMetrics.js";
import checkoutCreateWebhook from "./webhooks/checkoutCreate.js";
import ordersPaidWebhook from "./webhooks/ordersPaid.js";

/* ---------------------------------------------
   EXPRESS + PATH SETUP
----------------------------------------------*/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

/* ---------------------------------------------
   Allow Storefront → Analytics POST
----------------------------------------------*/
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

/* ---------------------------------------------
   Billing Setup
----------------------------------------------*/
const BILLING_PLAN_NAME = "Sticky Add-to-Cart Bar Pro";
const BILLING_TEST_MODE = process.env.SHOPIFY_BILLING_TEST === "true";

const billingConfig = {
  [BILLING_PLAN_NAME]: {
    amount: 4.99,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 14,
  },
};

/* ---------------------------------------------
   Shopify App Init
----------------------------------------------*/
const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    apiVersion: LATEST_API_VERSION,
    scopes: (process.env.SCOPES || "read_products,write_products")
      .split(",")
      .map((s) => s.trim()),
    hostName: (process.env.HOST || "").replace(/^https?:\/\//, ""),
    billing: billingConfig,
  },

  auth: {
    path: "/auth",
    callbackPath: "/auth/callback",
  },

  webhooks: {
    path: "/webhooks",
    topics: [
      "CHECKOUTS_CREATE",
      "ORDERS_PAID",
      "APP_UNINSTALLED",
      "THEMES_PUBLISH",
    ],
  },
});

/* ---------------------------------------------
   ANALYTICS SCRIPT INJECTION
----------------------------------------------*/
async function injectAnalyticsScript(shop) {
  try {
    const offlineId = shopify.api.session.getOfflineId(shop);
    const session =
      await shopify.config.sessionStorage.loadSession(offlineId);

    if (!session) return;

    const client = new shopify.api.clients.Rest({ session });

    // 1) Get themes
    const themesRes = await client.get({ path: "themes" });
    const mainTheme =
      themesRes.body.themes?.find((t) => t.role === "main") ??
      themesRes.body.themes?.[0];
    if (!mainTheme) return;

    // 2) Load theme.liquid
    const assetKey = "layout/theme.liquid";
    const themeFile = await client.get({
      path: `themes/${mainTheme.id}/assets`,
      query: { "asset[key]": assetKey },
    });

    const layout = themeFile.body.asset?.value || "";
    const injectionTag = `<script src="https://sticky-add-to-cart-bar-pro.onrender.com/sticky-analytics.js" defer></script>`;

    // Already inserted?
    if (layout.includes("sticky-analytics.js")) return;

    // Insert before </head>
    const updated = layout.includes("</head>")
      ? layout.replace("</head>", `  ${injectionTag}\n</head>`)
      : `${layout}\n${injectionTag}`;

    // 3) Save updated theme.liquid
    await client.put({
      path: `themes/${mainTheme.id}/assets`,
      data: { asset: { key: assetKey, value: updated } },
    });

    console.log(`🌟 Analytics injected → ${shop}`);
  } catch (err) {
    console.error("❌ Analytics inject error:", err);
  }
}

/* ---------------------------------------------
   WEBHOOK ENDPOINT (v10)
----------------------------------------------*/
app.post("/webhooks", async (req, res) => {
  try {
    const result = await shopify.webhooks.process(req, res);

    if (!result) return;

    /* Theme Publish → Reinjection */
    if (
      result.topic === "THEMES_PUBLISH" ||
      result.topic === "themes/publish"
    ) {
      await injectAnalyticsScript(result.shop);
    }

    /* App Uninstall Cleanup */
    if (
      result.topic === "APP_UNINSTALLED" ||
      result.topic === "app/uninstalled"
    ) {
      await prisma.stickyEvent.deleteMany({
        where: { shop: result.shop },
      });
    }
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).send("Webhook failed");
  }
});

/* ---------------------------------------------
   Billing Middleware
----------------------------------------------*/
async function requireBilling(req, res, next) {
  try {
    const session = res.locals.shopify?.session;
    if (!session) {
      const shop = req.query.shop;
      return res.redirect(`/auth?shop=${encodeURIComponent(shop)}`);
    }

    const { hasActivePayment } = await shopify.api.billing.check({
      session,
      plans: [BILLING_PLAN_NAME],
      isTest: BILLING_TEST_MODE,
    });

    if (hasActivePayment) return next();

    const appUrl =
      process.env.SHOPIFY_APP_URL || `https://${process.env.HOST}`;

    const confirmationUrl = await shopify.api.billing.request({
      session,
      plan: BILLING_PLAN_NAME,
      isTest: BILLING_TEST_MODE,
      returnUrl: `${appUrl}/?shop=${session.shop}`,
    });

    return res.redirect(confirmationUrl);
  } catch (err) {
    console.error("❌ Billing error:", err);
    res.status(500).send("Billing error");
  }
}

/* ---------------------------------------------
   AUTH ROUTES
----------------------------------------------*/
app.get("/auth", shopify.auth.begin());

app.get(
  "/auth/callback",
  shopify.auth.callback(),
  requireBilling,
  async (req, res) => {
    const session = res.locals.shopify.session;
    await injectAnalyticsScript(session.shop);
    res.redirect(`/?shop=${encodeURIComponent(session.shop)}`);
  }
);

/* ---------------------------------------------
   EXITIFRAME ROUTE (Required by Shopify)
----------------------------------------------*/
app.get("/exitiframe", (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send("Missing shop parameter");
  res.redirect(`/auth?shop=${encodeURIComponent(shop)}`);
});

/* ---------------------------------------------
   PROTECTED ANALYTICS API (Admin Dashboard)
----------------------------------------------*/
app.use(
  "/api/sticky",
  shopify.validateAuthenticatedSession(),
  requireBilling,
  stickyMetrics
);

/* ---------------------------------------------
   PUBLIC STOREFRONT ANALYTICS ENDPOINT
----------------------------------------------*/
app.use("/apps/bdm-sticky-atc", stickyAnalytics);

/* ---------------------------------------------
   SERVE REACT ADMIN UI (frontend/dist)
----------------------------------------------*/
app.use(
  serveStatic(path.join(__dirname, "frontend/dist"), {
    index: false,
  })
);

/* Root → Load React App */
app.get(
  "/",
  shopify.validateAuthenticatedSession(),
  requireBilling,
  (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/dist/index.html"));
  }
);

/* ---------------------------------------------
   START SERVER
----------------------------------------------*/
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
