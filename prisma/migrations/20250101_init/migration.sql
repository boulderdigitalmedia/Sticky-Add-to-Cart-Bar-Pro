CREATE TABLE "StickyEvent" (
  "id" SERIAL PRIMARY KEY,
  "shopDomain" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
