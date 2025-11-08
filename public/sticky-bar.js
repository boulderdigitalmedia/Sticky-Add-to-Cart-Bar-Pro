(function() {
  // Prevent multiple bars
  if (document.getElementById("sticky-add-to-cart-bar")) return;

  // Find product info from Shopify Liquid meta tags
  const productTitleMeta = document.querySelector('meta[property="og:title"]');
  const productPriceMeta = document.querySelector('meta[property="product:price:amount"]');

  // Fallback if meta tags not found
  const productTitle = productTitleMeta ? productTitleMeta.content : "Product";
  const productPrice = productPriceMeta ? productPriceMeta.content : "";

  // Create sticky bar container
  const bar = document.createElement("div");
  bar.id = "sticky-add-to-cart-bar";
  bar.style.position = "fixed";
  bar.style.bottom = "0";
  bar.style.left = "0";
  bar.style.width = "100%";
  bar.style.backgroundColor = "#2a9d8f";
  bar.style.color = "#fff";
  bar.style.display = "flex";
  bar.style.justifyContent = "space-between";
  bar.style.alignItems = "center";
  bar.style.padding = "1rem 2rem";
  bar.style.fontFamily = "Arial, sans-serif";
  bar.style.fontSize = "1.1rem";
  bar.style.zIndex = "9999";
  bar.style.boxShadow = "0 -2px 8px rgba(0,0,0,0.2)";
  bar.style.cursor = "pointer";

  // Product info
  const info = document.createElement("div");
  info.innerHTML = `<strong>${productTitle}</strong> - $${productPrice}`;

  // Add to cart button
  const button = document.createElement("button");
  button.textContent = "Add to Cart 🛒";
  button.style.backgroundColor = "#e76f51";
  button.style.border = "none";
  button.style.color = "#fff";
  button.style.padding = "0.5rem 1rem";
  button.style.borderRadius = "5px";
  button.style.cursor = "pointer";
  button.style.fontSize = "1rem";

  button.addEventListener("click", async (e) => {
    e.stopPropagation(); // prevent bar click redirect
    try {
      // Shopify AJAX API to add product to cart
      await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ id: window.meta.product_id || null, quantity: 1 }],
        }),
      });
      button.textContent = "Added!";
      setTimeout(() => (button.textContent = "Add to Cart 🛒"), 1500);
    } catch (err) {
      console.error("Error adding to cart:", err);
    }
  });

  // Append elements
  bar.appendChild(info);
  bar.appendChild(button);

  // Optional: clicking anywhere else on bar goes to cart
  bar.addEventListener("click", () => {
    window.location.href = "/cart";
  });

  document.body.appendChild(bar);
})();
