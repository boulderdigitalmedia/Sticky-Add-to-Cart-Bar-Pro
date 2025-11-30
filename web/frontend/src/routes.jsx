import { Routes, Route } from "react-router-dom";
import AnalyticsPage from "./pages/Analytics.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AnalyticsPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
    </Routes>
  );
}
