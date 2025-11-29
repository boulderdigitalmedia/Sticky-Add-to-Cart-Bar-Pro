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

// Resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.join(__dirname, "frontend", "dist");

/* --------------------------------------------------
   Billing (REAL billing for draft apps)
-------------------------------------------------- */
const BILLING_PLAN_NAME = "Sticky Add-to-Cart Bar Pro";
const billingConfig = {
  [BILLING_PLAN_NAME]: {
    amount: 4.99,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 14,
  },
};

/* --------------------------------------------------
   Shopify App Init
-------------------------------------------------- */
const shopify = shopifyApp({
  api: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    apiVersion: LATEST_API_VERSION,
    hostName: process.env.HOST.replace(/^https?:\/\//, ""),
    scopes: (process.env.SCOPES || "").split(","),
    billing: billingConfig,
  },
  auth: {
    path: "/auth",
    callbackPath: "/auth/callback",
  },
  webhooks: {
    path: "/webhooks",
    topics: ["APP_UNINSTALLED", "THEMES_PUBLISH"],
  },
});

/* --------------------------------------------------
   Inject Analytics Script
-------------------------------------------------- */
async function injectAnalyticsScript(shop) {
  try {
    const offlineId = shopify.api.session.getOfflineId(shop);
    const session = await shopify.config.sessionStorage.loadSession(offlineId);

    if (!session) return;

    const client = new shopify.api.clients.Rest({ session });
    const themes = (await client.get({ path: "themes" })).body.themes;
    const mainTheme = themes.find(t => t.role === "main") || themes[0];

    const assetKey = "layout/theme.liquid";
    const themeFile = await client.get({
      path: `themes/${mainTheme.id}/assets`,
      query: { "asset[key]": assetKey },
    });

    const layout = themeFile.body.asset?.value || "";
    const tag = `<script src="https://sticky-add-to-cart-bar-pro.onrender.com/sticky-analytics.js" defer></script>`;

    if (layout.includes("sticky-analytics.js")) return;

    const updated = layout.includes("</head>")
      ? layout.replace("</head>", `  ${tag}\n</head>`)
      : layout + "\n" + tag;

    await client.put({
      path: `themes/${mainTheme.id}/assets`,
      data: { asset: { key: assetKey, value: updated } },
    });

  } catch (err) {
    console.error("❌ Injection error:", err);
  }
}

/* --------------------------------------------------
   Webhooks
-------------------------------------------------- */
app.post("/webhooks", async (req, res) => {
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
    res.status(500).send("Webhook error");
  }
});

/* --------------------------------------------------
   Billing Middleware (REAL billing, no test mode)
-------------------------------------------------- */
async function requireBilling(req, res, next) {
  const session = res.locals.shopify?.session;

  if (!session) {
    const shop = req.query.shop;
    return res.redirect(`/exitiframe?shop=${shop}`);
  }

  // Check billing status
  const { hasActivePayment } = await shopify.api.billing.check({
    session,
    plans: [BILLING_PLAN_NAME],
    isTest: false,             // ⭐ REAL BILLING FOR DRAFT APPS
  });

  if (hasActivePayment) return next();

  const appUrl = `https://${process.env.HOST}`;

  // Redirect merchant to approve charge
  const confirmationUrl = await shopify.api.billing.request({
    session,
    plan: BILLING_PLAN_NAME,
    isTest: false,
    returnUrl: `${appUrl}/billing/complete?shop=${session.shop}`,
  });

  return res.redirect(confirmationUrl);
}

/* --------------------------------------------------
   Billing Redirect Target
-------------------------------------------------- */
app.get("/billing/complete", (req, res) => {
  const shop = req.query.shop;
  res.redirect(`/?shop=${encodeURIComponent(shop)}`);
});

/* --------------------------------------------------
   exitiframe (fixes redirect loops)
-------------------------------------------------- */
app.get("/exitiframe", (req, res) => {
  const shop = req.query.shop;
  res.send(`
    <script>
      window.top.location.href = "/auth?shop=${shop}";
    </script>
  `);
});

/* --------------------------------------------------
   OAuth
-------------------------------------------------- */
app.get("/auth", shopify.auth.begin());

app.get(
  "/auth/callback",
  shopify.auth.callback(),
  async (req, res) => {
    const session = res.locals.shopify.session;

    // Inject analytics after installation
    await injectAnalyticsScript(session.shop);

    // Now require billing
    const appUrl = `/?shop=${encodeURIComponent(session.shop)}`;
    return res.redirect(appUrl);
  }
);

/* --------------------------------------------------
   Admin Dashboard Backend API
-------------------------------------------------- */
app.use(
  "/api/sticky",
  shopify.validateAuthenticatedSession(),
  requireBilling,
  stickyMetrics
);

/* --------------------------------------------------
   Public Storefront Analytics Endpoint
-------------------------------------------------- */
app.use("/apps/bdm-sticky-atc", stickyAnalytics);

/* --------------------------------------------------
   Embedded Admin Root
-------------------------------------------------- */
app.get("/", async (req, res) => {
  const session = res.locals.shopify?.session;

  if (!session) {
    const shop = req.query.shop;
    return res.redirect(`/exitiframe?shop=${shop}`);
  }

  res.sendFile(path.join(frontendDist, "index.html"));
});

/* --------------------------------------------------
   Serve React Admin App
-------------------------------------------------- */
app.use(express.static(frontendDist));

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

/* --------------------------------------------------
   Start Server
-------------------------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Live on ${PORT}`));
