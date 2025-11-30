// web/frontend/src/App.jsx
import React from "react";
import { Frame, TopBar, Page } from "@shopify/polaris";
import AppNavigation from "./navigation.jsx";
import AppRouter from "./router.jsx";

export default function App() {
  const topBarMarkup = <TopBar />;

  return (
    <Frame topBar={topBarMarkup} navigation={<AppNavigation />}>
      <Page>
        <AppRouter />
      </Page>
    </Frame>
  );
}
