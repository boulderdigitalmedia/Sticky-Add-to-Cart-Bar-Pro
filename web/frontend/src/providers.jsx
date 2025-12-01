import React from "react";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import {
  Provider as AppBridgeProvider,
  useAppBridge,
} from "@shopify/app-bridge-react";

import { BrowserRouter } from "react-router-dom";

export default function Providers({ children }) {
  const host = new URLSearchParams(location.search).get("host");
  const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY;

  return (
    <PolarisProvider i18n={enTranslations}>
      <AppBridgeProvider
        config={{
          apiKey,
          host,
          forceRedirect: true,
        }}
      >
        <BrowserRouter>{children}</BrowserRouter>
      </AppBridgeProvider>
    </PolarisProvider>
  );
}
