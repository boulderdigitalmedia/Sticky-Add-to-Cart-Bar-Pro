(function () {
  // Utility: wait for element to exist
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const interval = 100;
      let elapsed = 0;
      const timer = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(timer);
          resolve(el);
        } else if ((elapsed += interval) >= timeout) {
          clearInterval(timer);
          reject("Element not found: " + selector);
        }
      }, interval);
    });
  }

  // Get product JSON from Shopify
  async function getProductJson() {
    const meta = document.querySelector('meta[name="shopify-digital-product-json"]');
    if (meta) return JSON.parse(meta.content);
    // fallback: use window.ProductJSON if available
    return window.productJson || null;
  }

  // Create sticky bar
  function createStickyBar(product) {
    if (!product) return;
    const bar = document.createElement("div");
    bar.id = "sticky-add-to-cart-bar";
    bar.style = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      background: #222;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      z-index: 9999;
      font-family: sans-serif;
    `;

    // Product info
    const info = document.createElement("div");
    info.innerHTML = `<strong>${product.title}</strong> - <span id="sticky-price">${formatMoney(product.price)}</span>`;
    bar.appendChild(info);

    // Variant selector if multiple
    let variantSelect = null;
    if (product.variants && product.variants.length > 1) {
      variantSelect = document.createElement("select");
      variantSelect.id = "sticky-variant-select";
      product.variants.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = `${v.title} - ${formatMoney(v.price)}`;
        variantSelect.appendChild(opt);
      });
      bar.appendChild(variantSelect);
    }

    // Add to cart button
    const btn = document.createElement("button");
    btn.textContent = "Add to Cart";
    btn.style = `
      background: #ff6f61;
      border: none;
      padding: 10px 20px;
      color: white;
      cursor: pointer;
      border-radius: 4px;
    `;
    bar.appendChild(btn);

    // Append to body
    document.body.appendChild(bar);

    // Button click handler
    btn.addEventListener("click", async () => {
      const variantId = variantSelect ? variantSelect.value : product.variants[0].id;
      await addToCart(variantId, 1);
      btn.textContent = "✅ Added!";
      setTimeout(() => (btn.textContent = "Add to Cart"), 2000);
    });
  }

  // Add item to Shopify cart via AJAX
  async function addToCart(variantId, quantity) {
    try {
      await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: variantId, quantity: quantity }),
      });
    } catch (err) {
      console.error("Add to cart failed", err);
    }
  }

  // Format Shopify money
  function formatMoney(cents) {
    if (!cents) return "";
    return `$${(cents / 100).toFixed(2)}`;
  }

  // Initialize sticky bar
  async function init() {
    try {
      const product = await getProductJson();
      if (!product) {
        console.warn("Sticky bar: product JSON not found");
        return;
      }
      createStickyBar(product);
    } catch (err) {
      console.error("Sticky bar init failed", err);
    }
  }

  // Wait for DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
