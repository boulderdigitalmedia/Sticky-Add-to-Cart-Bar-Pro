import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

// Setup file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));

// Embedded admin path for Shopify
app.get("/apps", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Root path (health check)
app.get("/", (req, res) => {
  res.send("Sticky Add-to-Cart Bar app is running ✅");
});

// Later: add /auth and /auth/callback for Shopify OAuth

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

