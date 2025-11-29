// web/index.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { shopifyApp } from "@shopify/shopify-app-express";
import { BillingInterval, LATEST_API_VERSION } from "@shopify/shopify-api";
import { PrismaClient } from "@prisma/client";

import stickyAnalytics from "./routes/stickyAnalytics.js";
import stickyMetrics from "./routes/stickyMetrics.js";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

/* --------------------------------------------------
   Resolve __dirname + frontend build path
-------------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.join(__dirname, "frontend", "dist");

/* --------------------------------------------------
   CORS for storefront analytics endpoint
-------------------------------------------------- */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

/* --------------------------------------------------
   Billing configuration
   - Toggle test/real billing via SHOPIFY_BILLING_TEST env
-------------------------------------------------- */
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

/* --------------------------------------------------
   Shopify app initialization (v10 style)
-------------------------------------------------- */
const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    apiVersion: LATEST_API_VERSION,
    hostName: process.env.HOST.replace(/^https?:\/\//, ""),
    scopes: (process.env.SCOPES || "read_products,write_products").split(","),
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

/* --------------------------------------------------
   Helper: inject analytics script into main theme
-------------------------------------------------- */
async function injectAnalyticsScript(shop) {
  try {
    const offlineId = shopify.api.session.getOfflineId(shop);
    const session = await shopify.config.sessionStorage.loadSession(offlineId);

    if (!session) {
      console.warn("⚠ No offline session for", shop);
      return;
    }

    const client = new shopify.api.clients.Rest({ session });

    const themesRes = await client.get({ path: "themes" });
    const mainTheme =
      themesRes.body.themes?.find((t) => t.role === "main") ??
      themesRes.body.themes?.[0];

    if (!mainTheme) return;

    const assetKey = "layout/theme.liquid";
    const themeFile = await client.get({
      path: `themes/${mainTheme.id}/assets`,
      query: { "asset[key]": assetKey },
    });

    const layout = themeFile.body.asset?.value || "";
    const injectionTag =
      `<script src="https://sticky-add-to-cart-bar-pro.onrender.com/sticky-analytics.js" defer></script>`;

    if (layout.includes("sticky-analytics.js")) {
      console.log("✅ Analytics already injected for", shop);
      return;
    }

    const updated = layout.includes("</head>")
      ? layout.replace("</head>", `  ${injectionTag}\n</head>`)
      : `${layout}\n${injectionTag}`;

    await client.put({
      path: `themes/${mainTheme.id}/assets`,
      data: { asset: { key: assetKey, value: updated } },
    });

    console.log(`🌟 Injected analytics into ${shop}`);
  } catch (err) {
    console.error("❌ Analytics injection error:", err);
  }
}

/* --------------------------------------------------
   Helper: ensure billing (used in auth + API)
   - Returns true if shop is already paid
   - If not, redirects to confirmation URL and returns false
-------------------------------------------------- */
async function ensureBilling(session, res) {
  const { hasActivePayment } = await shopify.api.billing.check({
    session,
    plans: [BILLING_PLAN_NAME],
    isTest: BILLING_TEST_MODE,
  });

  if (hasActivePayment) return true;

  const appUrl = process.env.SHOPIFY_APP_URL || `https://${process.env.HOST}`;
  const confirmationUrl = await shopify.api.billing.request({
    session,
    plan: BILLING_PLAN_NAME,
    isTest: BILLING_TEST_MODE,
    returnUrl: `${appUrl}/api/billing/complete?shop=${session.shop}`,
  });

  res.redirect(confirmationUrl);
  return false;
}

/* --------------------------------------------------
   Webhooks endpoint (Shopify → your app)
-------------------------------------------------- */
app.post(shopify.config.webhooks.path, async (req, res) => {
  try {
    const result = await shopify.webhooks.process(req, res);

    if (result?.topic === "themes/publish") {
      await injectAnalyticsScript(result.shop);
    }

    if (result?.topic === "app/uninstalled") {
      await prisma.stickyEvent.deleteMany({ where: { shop: result.shop } });
    }
  } catch (err) {
    console.error("❌ Webhook error:", err);
    if (!res.headersSent) res.status(500).send("Webhook error");
  }
});

/* --------------------------------------------------
   AUTH FLOW (embedded-safe)
-------------------------------------------------- */

// Start OAuth
app.get(shopify.config.auth.path, shopify.auth.begin());

// OAuth callback
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res) => {
    const session = res.locals.shopify.session;

    // Make sure billing is active (this may redirect to billing screen)
    const ok = await ensureBilling(session, res);
    if (!ok) return; // redirected to billing

    // Ensure analytics is injected at least once
    await injectAnalyticsScript(session.shop);

    // Let Shopify either bounce back to Admin or into the embedded app
    return shopify.redirectToShopifyOrAppRoot(req, res);
  }
);

/* --------------------------------------------------
   Billing completion callback (returnUrl)
-------------------------------------------------- */
app.get(
  "/api/billing/complete",
  shopify.validateAuthenticatedSession(),
  async (req, res) => {
    const session = res.locals.shopify.session;

    // At this point Shopify has activated the charge
    await injectAnalyticsScript(session.shop);

    return shopify.redirectToShopifyOrAppRoot(req, res);
  }
);

/* --------------------------------------------------
   Protected API for analytics dashboard
-------------------------------------------------- */
app.use(
  "/api/sticky",
  shopify.validateAuthenticatedSession(),
  async (req, res, next) => {
    const session = res.locals.shopify.session;
    const ok = await ensureBilling(session, res);
    if (!ok) return;
    next();
  },
  stickyMetrics
);

/* --------------------------------------------------
   Public storefront analytics endpoint
-------------------------------------------------- */
app.use("/apps/bdm-sticky-atc", stickyAnalytics);

/* --------------------------------------------------
   Serve static React admin build
-------------------------------------------------- */
app.use(express.static(frontendDist));

/* --------------------------------------------------
   Embedded Admin root
   - ensureInstalledOnShop handles:
     * third-party cookie checks
     * exitiframe logic
     * initial auth redirects
-------------------------------------------------- */
app.use(
  "/*",
  shopify.ensureInstalledOnShop(),
  (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  }
);

/* --------------------------------------------------
   Start server
-------------------------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sticky ATC server running on port ${PORT}`);
});
