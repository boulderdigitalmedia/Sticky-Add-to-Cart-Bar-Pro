// web/shopify.js
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import { ShopifyApp } from "@shopify/shopify-app-express";
import { billingConfig } from "./billing.js";

const shopify = ShopifyApp({
  api: shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    apiVersion: LATEST_API_VERSION,
    scopes: (process.env.SCOPES || "").split(","),
    hostName: process.env.SHOPIFY_APP_URL.replace(/^https?:\/\//, ""),
    hostScheme: "https",
    isEmbeddedApp: true,
  }),

  auth: {
    path: "/auth",
    callbackPath: "/auth/callback",
  },

  webhooks: {
    path: "/webhooks",
  },

  billing: billingConfig,
});

export default shopify;
