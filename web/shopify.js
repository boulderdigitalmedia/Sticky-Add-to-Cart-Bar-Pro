// web/shopify.js
import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";
import pkg from "@shopify/shopify-app-express";
const { shopifyApp } = pkg;

import { billingConfig } from "./billing.js";

const shopify = shopifyApp({
  api: shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: true,
    hostName: process.env.SHOPIFY_APP_URL.replace(/^https?:\/\//, ""),
    hostScheme: "https",
    scopes: (process.env.SCOPES || "").split(","),
  }),

  auth: {
    path: "/auth",
    callbackPath: "/auth/callback",
  },

  webhooks: {
    path: "/webhooks",
  },

  // Billing is optional but you have it enabled
  billing: billingConfig,
});

export default shopify;
