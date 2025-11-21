// Sticky Add to Cart Bar – Desktop Version A + Compact Mobile + Full Cart Sync
(function () {
  /* -------------------------------------------------------
     UNIVERSAL CART UPDATE (New Version – fixes all themes)
  ---------------------------------------------------------*/
  function updateCartIconAndDrawer() {
    fetch("/cart.js")
      .then((res) => res.json())
      .then((cart) => {
        const count = cart.item_count;

        // Update all cart counter elements
        const countEls = document.querySelectorAll(
          ".cart-count, .cart-count-bubble, [data-cart-count]"
        );
        countEls.forEach((el) => {
          el.textContent = count;
          el.dataset.cartCount = count;
          el.classList.toggle("hidden", count === 0);
        });

        // Trigger theme events
        document.dispatchEvent(new CustomEvent("cart:refresh"));
        document.dispatchEvent(new CustomEvent("ajaxProduct:added"));
        document.dispatchEvent(
          new CustomEvent("cartcount:update", { detail: { count } })
        );

        // Dawn 7.0+ Drawer update
        const drawer = document.querySelector("cart-drawer");
        if (drawer?.renderContents) {
          drawer.renderContents(cart);
        }

        // Older dawn themes
        if (window.fetchCart) window.fetchCart();
        if (window.updateCart) window.updateCart();

        // Trigger drawer open (covers most themes)
        const drawerToggle = document.querySelector(
          "[data-cart-toggle], [data-drawer-toggle], .js-cart-toggle, [aria-controls='CartDrawer']"
        );
        if (drawerToggle) drawerToggle.click();
      })
      .catch((err) => console.error("Cart update failed:", err));
  }

  /* -------------------------------------------------------
     INIT STICKY BAR
  ---------------------------------------------------------*/
  function initStickyBar() {
    const root = document.getElementById("bdm-sticky-atc-bar-root");
    if (!root) return;

    const productForm = document.querySelector('form[action*="/cart/add"]');
    if (!productForm) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const productTitle = root.dataset.productTitle;

    // Variant handling
    let variants = window.ShopifyAnalytics?.meta?.product?.variants || [];
    const hasVariants = variants.length > 1;

    const variantSelectForm = productForm.querySelector("select[name='id']");
    let currentVariantId = variantSelectForm
      ? variantSelectForm.value
      : variants[0]?.id;

    if (!currentVariantId) {
      const fallback = productForm.querySelector("[name='id']");
      if (fallback) currentVariantId = fallback.value;
    }

    const findVariantById = (id) =>
      variants.find((v) => String(v.id) === String(id));

    const formatMoney = (cents) =>
      (cents / 100).toLocaleString(undefined, {
        style: "currency",
        currency: Shopify.currency.active,
      });

    let currentPrice = findVariantById(currentVariantId)?.price;

    /* -------------------------------------------------------
       BAR & STRUCTURE
    ---------------------------------------------------------*/
    const bar = document.createElement("div");
    bar.className = "bdm-sticky-atc-bar-container";

    const inner = document.createElement("div");
    inner.className = "bdm-sticky-atc-bar-inner";

    /* -------------------------------------------------------
       PRODUCT INFO: Title + Price
    ---------------------------------------------------------*/
    const productInfo = document.createElement("div");
    productInfo.className = "bdm-sticky-atc-product";

    const titleEl = document.createElement("div");
    titleEl.className = "bdm-sticky-atc-title";
    titleEl.textContent = productTitle;

    const priceEl = document.createElement("div");
    priceEl.className = "bdm-sticky-atc-price";
    priceEl.textContent = formatMoney(currentPrice);

    productInfo.append(titleEl, priceEl);

    /* -------------------------------------------------------
       VARIANT SELECTOR
    ---------------------------------------------------------*/
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
        const v = findVariantById(currentVariantId);
        if (v) priceEl.textContent = formatMoney(v.price);

        if (variantSelectForm) {
          variantSelectForm.value = currentVariantId;
          variantSelectForm.dispatchEvent(
            new Event("change", { bubbles: true })
          );
        }
      });

      // MOBILE: Variant replaces title
      if (isMobile) {
        titleEl.style.display = "none";

        const mobileVariantRow = document.createElement("div");
        mobileVariantRow.className = "bdm-variant-mobile-row";
        mobileVariantRow.append(select);

        productInfo.insertBefore(mobileVariantRow, priceEl);
      }

      // DESKTOP: Variant stays in the controls row
      if (!isMobile) {
        variantWrapper.append(select);
      }
    }

    /* -------------------------------------------------------
       QUANTITY CONTROLS
    ---------------------------------------------------------*/
    const qtyWrapper = document.createElement("div");
    qtyWrapper.className = "bdm-sticky-atc-qty";

    const minusBtn = document.createElement("button");
    minusBtn.className = "bdm-qty-btn";
    minusBtn.textContent = "−";

    const qtyInput = document.createElement("input");
    qtyInput.className = "bdm-qty-input";
    qtyInput.type = "number";
    qtyInput.min = "1";
    qtyInput.value = "1";

    const plusBtn = document.createElement("button");
    plusBtn.className = "bdm-qty-btn";
    plusBtn.textContent = "+";

    minusBtn.onclick = () =>
      (qtyInput.value = Math.max(1, Number(qtyInput.value) - 1));

    plusBtn.onclick = () =>
      (qtyInput.value = Number(qtyInput.value) + 1);

    qtyWrapper.append(minusBtn, qtyInput, plusBtn);

    /* -------------------------------------------------------
       ADD TO CART BUTTON
    ---------------------------------------------------------*/
    const atcButton = document.createElement("button");
    atcButton.className = "bdm-sticky-atc-button";
    atcButton.textContent = "Add to cart";

    atcButton.addEventListener("click", async () => {
      const quantity = Math.max(1, Number(qtyInput.value) || 1);

      const res = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id: currentVariantId, quantity }),
      });

      if (res.ok) updateCartIconAndDrawer();
      else alert("Unable to add to cart. Try again.");
    });

    /* -------------------------------------------------------
       CONTROLS LAYOUT
    ---------------------------------------------------------*/
    const controls = document.createElement("div");
    controls.className = "bdm-sticky-atc-controls";

    // Desktop Version A = variant + qty + ATC
    if (!isMobile && hasVariants) {
      controls.append(variantWrapper, qtyWrapper, atcButton);
    } else {
      // Mobile = variant moved up, so only qty + ATC here
      controls.append(qtyWrapper, atcButton);
    }

    /* -------------------------------------------------------
       BUILD STRUCTURE
    ---------------------------------------------------------*/
    inner.append(productInfo, controls);
    bar.append(inner);
    document.body.append(bar);
  }

  // Initialize
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStickyBar);
  } else {
    initStickyBar();
  }
})();
