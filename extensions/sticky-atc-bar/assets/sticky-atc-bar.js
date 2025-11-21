(function () {
  function initStickyBar() {
    const root = document.getElementById("bdm-sticky-atc-bar-root");
    if (!root) return;

    // Only show on product pages with a product form
    const productForm = document.querySelector('form[action*="/cart/add"]');
    if (!productForm) return;

    const productTitle =
      root.dataset.productTitle ||
      (window.ShopifyAnalytics &&
        window.ShopifyAnalytics.meta &&
        window.ShopifyAnalytics.meta.product &&
        window.ShopifyAnalytics.meta.product.name) ||
      document.title;

    // Try to get variants from ShopifyAnalytics
    let variants =
      (window.ShopifyAnalytics &&
        window.ShopifyAnalytics.meta &&
        window.ShopifyAnalytics.meta.product &&
        window.ShopifyAnalytics.meta.product.variants) ||
      [];

    // Try to detect the "main" product variant select
    const variantSelect = productForm.querySelector('select[name="id"]');
    let currentVariantId = variantSelect ? variantSelect.value : null;

    if (!currentVariantId && variants.length) {
      currentVariantId = String(variants[0].id);
    }

    function findVariantById(id) {
      return variants.find((v) => String(v.id) === String(id));
    }

    function getCurrency() {
      try {
        if (window.Shopify && Shopify.currency && Shopify.currency.active) {
          return Shopify.currency.active;
        }
      } catch (e) {
        // ignore
      }
      return "USD";
    }

    function formatMoney(cents) {
      if (typeof cents === "string") cents = parseInt(cents, 10);
      const value = (cents || 0) / 100;
      return value.toLocaleString(undefined, {
        style: "currency",
        currency: getCurrency(),
      });
    }

    let currentPrice = null;
    if (variants.length && currentVariantId) {
      const v = findVariantById(currentVariantId);
      if (v) currentPrice = v.price;
    }

    // Build sticky bar DOM
    const bar = document.createElement("div");
    bar.className = "bdm-sticky-atc-bar-container";

    const inner = document.createElement("div");
    inner.className = "bdm-sticky-atc-bar-inner";

    const productInfo = document.createElement("div");
    productInfo.className = "bdm-sticky-atc-product";
    productInfo.innerHTML = `
      <div class="bdm-sticky-atc-title">${productTitle}</div>
      <div class="bdm-sticky-atc-price">${
        currentPrice ? formatMoney(currentPrice) : ""
      }</div>
    `;

    const controls = document.createElement("div");
    controls.className = "bdm-sticky-atc-controls";

    // Variant selector (simple)
    const variantWrapper = document.createElement("div");
    variantWrapper.className = "bdm-sticky-atc-variant";

    if (variants.length > 1) {
      const label = document.createElement("span");
      label.textContent = "Variant";

      const select = document.createElement("select");

      variants.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent =
          v.public_title || v.title || v.name || `Variant ${v.id}`;
        if (String(v.id) === String(currentVariantId)) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener("change", () => {
        currentVariantId = select.value;
        const v = findVariantById(currentVariantId);
        if (v) {
          currentPrice = v.price;
          const priceEl = productInfo.querySelector(".bdm-sticky-atc-price");
          if (priceEl) priceEl.textContent = formatMoney(v.price);
        }

        // Sync with the main product form if possible
        if (variantSelect) {
          variantSelect.value = currentVariantId;
          variantSelect.dispatchEvent(
            new Event("change", { bubbles: true, cancelable: true })
          );
        }
      });

      variantWrapper.appendChild(label);
      variantWrapper.appendChild(select);
    }

    // Quantity controls
    const qtyWrapper = document.createElement("div");
    qtyWrapper.className = "bdm-sticky-atc-qty";

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.textContent = "−";

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "1";
    qtyInput.value = "1";
    qtyInput.inputMode = "numeric";

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.textContent = "+";

    minusBtn.addEventListener("click", () => {
      const value = Math.max(1, parseInt(qtyInput.value || "1", 10) - 1);
      qtyInput.value = String(value);
    });

    plusBtn.addEventListener("click", () => {
      const value = Math.max(1, parseInt(qtyInput.value || "1", 10) + 1);
      qtyInput.value = String(value);
    });

    qtyWrapper.appendChild(minusBtn);
    qtyWrapper.appendChild(qtyInput);
    qtyWrapper.appendChild(plusBtn);

    // Add to cart button
    const atcButton = document.createElement("button");
    atcButton.type = "button";
    atcButton.className = "bdm-sticky-atc-button";
    atcButton.textContent = "Add to cart";

    atcButton.addEventListener("click", async () => {
      const quantity = Math.max(1, parseInt(qtyInput.value || "1", 10));

      const variantIdToUse =
        currentVariantId ||
        (variantSelect && variantSelect.value) ||
        (productForm.querySelector('[name="id"]') &&
          productForm.querySelector('[name="id"]').value);

      if (!variantIdToUse) {
        alert("Please select a variant");
        return;
      }

      try {
        const res = await fetch("/cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            id: variantIdToUse,
            quantity,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error("Add to cart failed", data);
          alert("Could not add to cart. Please try again.");
          return;
        }

        // TODO later: send analytics ping to your backend

        // Try to open cart drawer if theme has one
        const drawer =
          document.querySelector("[data-cart-drawer]") ||
          document.querySelector(".cart-drawer") ||
          document.querySelector("#CartDrawer");

        if (drawer) {
          // Try clicking anything that looks like a cart toggle
          const triggers = document.querySelectorAll(
            '[data-cart-toggle], [href*="/cart"], .js-cart-toggle'
          );
          if (triggers.length) {
            triggers[0].dispatchEvent(
              new Event("click", { bubbles: true, cancelable: true })
            );
          } else {
            window.location.href = "/cart";
          }
        } else {
          window.location.href = "/cart";
        }
      } catch (err) {
        console.error("Error adding to cart", err);
        alert("There was an error. Please try again.");
      }
    });

    controls.appendChild(variantWrapper);
    controls.appendChild(qtyWrapper);
    controls.appendChild(atcButton);

    // Footer (for free plan watermark)
    const footer = document.createElement("div");
    footer.className = "bdm-sticky-atc-footer";
    footer.textContent = "Powered by Boulder Digital Media";

    inner.appendChild(productInfo);
    inner.appendChild(controls);
    inner.appendChild(footer);

    bar.appendChild(inner);
    document.body.appendChild(bar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStickyBar);
  } else {
    initStickyBar();
  }
})();
