import React from "react";
import { Routes, Route } from "@shopify/react-router";
import Home from "./pages/Home.jsx";
import Analytics from "./pages/Analytics.jsx";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/analytics" element={<Analytics />} />
    </Routes>
  );
}
