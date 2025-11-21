// Sticky Add to Cart Bar – Desktop vA + Compact Mobile (Stable Refresh Version)
(function () {
  /* ============================================================
     CART UPDATE HANDLER – Works across ALL Shopify themes
     ============================================================ */
  function updateCartEverywhere() {
    // 1. Trigger common theme events
    document.dispatchEvent(new CustomEvent("cart:refresh"));
    document.dispatchEvent(new CustomEvent("theme:cart:update"));
    document.dispatchEvent(new CustomEvent("drawer:refresh"));

    if (window.fetchCart) window.fetchCart();
    if (window.updateCart) window.updateCart();
    if (window.Cart && window.Cart.render) window.Cart.render();

    // 2. Update Dawn's live cart region
    const liveRegions = document.querySelectorAll("[data-cart-live-region]");
    liveRegions.forEach(el => {
      el.textContent = "Updated";
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // 3. Update drawer if theme uses <cart-drawer>
    const cartDrawer = document.querySelector("cart-drawer");
    if (cartDrawer && cartDrawer.renderContents) {
      fetch("/cart?section_id=cart-drawer")
        .then(res => res.text())
        .then(html => {
          cartDrawer.renderContents(html);
        });
    }

    // 4. Update cart icon bubble
    fetch("/cart.js")
      .then(res => res.json())
      .then(cart => {
        const els = document.querySelectorAll(
          ".cart-count, .cart-count-bubble, [data-cart-count]"
        );
        els.forEach((el) => {
          el.textContent = cart.item_count;
          el.dataset.cartCount = cart.item_count;
        });
      })
      .catch(() => {});
  }

  /* ============================================================
     INIT STICKY BAR 
     ============================================================ */
  function initStickyBar() {
    const root = document.getElementById("bdm-sticky-atc-bar-root");
    if (!root) return;

    const productForm = document.querySelector('form[action*="/cart/add"]');
    if (!productForm) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const productTitle = root.dataset.productTitle || document.title;

    /* ------- Variant Handling ------- */
    let variants = window.ShopifyAnalytics?.meta?.product?.variants || [];
    const hasVariants = variants.length > 1;

    const pageVariantSelect = productForm.querySelector("select[name='id']");
    let currentVariantId = pageVariantSelect
      ? pageVariantSelect.value
      : variants[0]?.id;

    if (!currentVariantId) {
      const fallback = productForm.querySelector("[name='id']");
      if (fallback) currentVariantId = fallback.value;
    }

    const findVariant = (id) =>
      variants.find((v) => String(v.id) === String(id));

    const formatMoney = (cents) =>
      ((typeof cents === "number" ? cents : 0) / 100).toLocaleString(
        undefined,
        { style: "currency", currency: Shopify?.currency?.active || "USD" }
      );

    let currentPrice = findVariant(currentVariantId)?.price;

    /* ------- BAR CONTAINER ------- */
    const bar = document.createElement("div");
    bar.className = "bdm-sticky-atc-bar-container";
    bar.style.zIndex = "99999"; // fixes overlap with cart icon

    const inner = document.createElement("div");
    inner.className = "bdm-sticky-atc-bar-inner";

    /* ------- PRODUCT INFO ------- */
    const productInfo = document.createElement("div");
    productInfo.className = "bdm-sticky-atc-product";

    const titleEl = document.createElement("div");
    titleEl.className = "bdm-sticky-atc-title";
    titleEl.textContent = productTitle;

    const priceEl = document.createElement("div");
    priceEl.className = "bdm-sticky-atc-price";
    priceEl.textContent = formatMoney(currentPrice);

    productInfo.append(titleEl, priceEl);

    /* ------- VARIANT SELECT ------- */
    const variantWrapper = document.createElement("div");
    variantWrapper.className = "bdm-sticky-atc-variant";

    if (hasVariants) {
      const select = document.createElement("select");
      select.className = "bdm-sticky-atc-variant-select";

      variants.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = v.public_title || v.title;
        select.appendChild(opt);
      });

      select.value = currentVariantId;

      select.addEventListener("change", () => {
        currentVariantId = select.value;
        const v = findVariant(currentVariantId);
        if (v) priceEl.textContent = formatMoney(v.price);

        if (pageVariantSelect) {
          pageVariantSelect.value = currentVariantId;
          pageVariantSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      if (isMobile) {
        titleEl.style.display = "none";

        const mobileRow = document.createElement("div");
        mobileRow.className = "bdm-variant-mobile-row";
        mobileRow.appendChild(select);

        productInfo.insertBefore(mobileRow, priceEl);
      } else {
        variantWrapper.appendChild(select);
      }
    }

    /* ------- QUANTITY ------- */
    const qtyWrapper = document.createElement("div");
    qtyWrapper.className = "bdm-sticky-atc-qty";

    const minusBtn = document.createElement("button");
    minusBtn.className = "bdm-qty-btn";
    minusBtn.textContent = "−";

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "1";
    qtyInput.value = "1";
    qtyInput.className = "bdm-qty-input";

    const plusBtn = document.createElement("button");
    plusBtn.className = "bdm-qty-btn";
    plusBtn.textContent = "+";

    minusBtn.onclick = () => {
      qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
    };

    plusBtn.onclick = () => {
      qtyInput.value = Number(qtyInput.value) + 1;
    };

    qtyWrapper.append(minusBtn, qtyInput, plusBtn);

    /* ------- ADD TO CART ------- */
    const atcButton = document.createElement("button");
    atcButton.className = "bdm-sticky-atc-button";
    atcButton.textContent = "Add to cart";

    atcButton.addEventListener("click", async () => {
      if (!currentVariantId) {
        const fallback = productForm.querySelector("[name='id']");
        if (fallback) currentVariantId = fallback.value;
      }
      if (!currentVariantId) {
        alert("Variant not selected.");
        return;
      }

      const quantity = Math.max(1, Number(qtyInput.value));

      const res = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id: currentVariantId, quantity }),
      });

      if (!res.ok) {
        console.error(await res.text());
        alert("Failed to add to cart");
        return;
      }

      updateCartEverywhere();
    });

    /* ------- CONTROLS ------- */
    const controls = document.createElement("div");
    controls.className = "bdm-sticky-atc-controls";

    if (!isMobile && hasVariants) {
      controls.append(variantWrapper, qtyWrapper, atcButton);
    } else {
      controls.append(qtyWrapper, atcButton);
    }

    inner.append(productInfo, controls);
    bar.appendChild(inner);
    document.body.appendChild(bar);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", initStickyBar)
    : initStickyBar();
})();
