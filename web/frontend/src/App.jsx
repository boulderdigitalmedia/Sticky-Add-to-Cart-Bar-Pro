import React from "react";
import { Page } from "@shopify/polaris";
import AppRouter from "./router.jsx";
import Navigation from "./navigation.jsx";

export default function App() {
  return (
    <Page fullWidth>
      <div style={{ display: "flex" }}>
        <div style={{ width: 240 }}>
          <Navigation />
        </div>

        <div style={{ flex: 1, padding: "20px" }}>
          <AppRouter />
        </div>
      </div>
    </Page>
  );
}
