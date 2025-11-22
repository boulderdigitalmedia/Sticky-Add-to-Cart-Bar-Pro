// ============================================================================
// UNIVERSAL VARIANT + CART EVENT ENGINE (BDM Sticky ATC Pro)
// ============================================================================
(function () {
  window.BDMStickyATC = window.BDMStickyATC || {};

  const engine = window.BDMStickyATC;
  engine.currentVariantId = null;

  /* -----------------------------
     UNIVERSAL VARIANT DETECTION
  ----------------------------- */
  engine.initVariantDetection = function () {
    function detectVariant() {
      let newId = null;

      // Hidden variant input (standard Shopify)
      const hidden = document.querySelector('input[name="id"]');
      if (hidden?.value) newId = hidden.value;

      // Select dropdown
      const selects = document.querySelectorAll('select[name="id"]');
      selects.forEach(sel => {
        if (sel.value) newId = sel.value;
      });

      // Radio / swatch selectors
      const checked = document.querySelector(
        'input[type="radio"][name*="option"]:checked, input[data-variant-id]:checked'
      );
      if (checked?.dataset?.variantId) {
        newId = checked.dataset.variantId;
      }

      if (newId && newId !== engine.currentVariantId) {
        engine.currentVariantId = newId;

        document.dispatchEvent(
          new CustomEvent("BDM:variantChanged", {
            detail: { variantId: newId },
          })
        );
      }
    }

    // Watch changes
    document.body.addEventListener("change", detectVariant, true);
    document.body.addEventListener("input", detectVariant, true);

    // Watch DOM replacements (Prestige, Turbo, etc.)
    const obs = new MutationObserver(detectVariant);
    obs.observe(document.body, { childList: true, subtree: true });

    detectVariant();
  };

  /* -----------------------------
     UNIVERSAL ATC DETECTION
  ----------------------------- */
  engine.initATCDetection = function () {
    // Patch fetch()
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      const url = args[0];
      if (typeof url === "string" && url.includes("/cart/add")) {
        response.clone().json().then(json => {
          document.dispatchEvent(
            new CustomEvent("BDM:addedToCart", { detail: { json } })
          );
        });
      }
      return response;
    };

    // Patch XMLHttpRequest
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      this._bdm_url = url;
      return origOpen.apply(this, arguments);
    };

    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function () {
      this.addEventListener("load", function () {
        if (this._bdm_url?.includes("/cart/add")) {
          try {
            const json = JSON.parse(this.responseText);
            document.dispatchEvent(
              new CustomEvent("BDM:addedToCart", { detail: { json } })
            );
          } catch (e) { }
        }
      });
      return origSend.apply(this, arguments);
    };
  };

  /* -----------------------------
     UNIVERSAL CART REFRESH EVENT
  ----------------------------- */
  engine.refreshCart = async function () {
    try {
      const res = await fetch("/cart.js");
      const cart = await res.json();

      document.dispatchEvent(
        new CustomEvent("BDM:cartUpdated", { detail: { cart } })
      );
      return cart;
    } catch (e) { }
  };

  /* Initialize detection engine */
  engine.init = function () {
    engine.initVariantDetection();
    engine.initATCDetection();

    document.addEventListener("BDM:addedToCart", () => engine.refreshCart());
  };

  engine.init();
})();



// ============================================================================
// YOUR EXISTING STICKY BAR — UPDATED TO USE UNIVERSAL ENGINE EVENTS
// ============================================================================
(function () {

  /* =========================================
     CART REFRESH: theme-aware + universal fallback
     ========================================= */
  async function updateCartIconAndDrawer() {
    let handledByThemeDrawer = false;

    // ----- TIER 1: Dawn-style section refresh -----
    try {
      const rootPath =
        (window.Shopify &&
          window.Shopify.routes &&
          window.Shopify.routes.root) ||
        "/";

      const sectionsRes = await fetch(
        `${rootPath}?sections=cart-drawer,cart-icon-bubble`
      );

      let sections = null;
      try {
        sections = await sectionsRes.json();
      } catch (e) {
        sections = null;
      }

      if (sections) {
        const parsedState = {
          id: Date.now(),
          sections,
        };

        const cartDrawer = document.querySelector("cart-drawer");

        if (
          cartDrawer &&
          typeof cartDrawer.renderContents === "function" &&
          sections["cart-drawer"]
        ) {
          cartDrawer.renderContents(parsedState);
          handledByThemeDrawer = true;
        }

        const bubbleContainer = document.getElementById("cart-icon-bubble");
        if (bubbleContainer && sections["cart-icon-bubble"]) {
          const temp = document.createElement("div");
          temp.innerHTML = sections["cart-icon-bubble"];
          const newBubble = temp.querySelector("#cart-icon-bubble");
          if (newBubble) bubbleContainer.replaceWith(newBubble);
          handledByThemeDrawer = true;
        }
      }
    } catch (err) { }

    // ----- TIER 2: Universal cart.js update -----
    try {
      const cart = await fetch("/cart.js").then((r) => r.json());
      const count = cart.item_count;

      const countEls = document.querySelectorAll(
        ".cart-count, .cart-count-bubble, [data-cart-count]"
      );
      countEls.forEach((el) => {
        el.textContent = count;
        el.dataset.cartCount = count;

        if (count > 0) {
          el.removeAttribute("hidden");
          el.setAttribute("aria-hidden", "false");
          el.classList.remove("is-empty");
        } else {
          el.setAttribute("aria-hidden", "true");
          el.classList.add("is-empty");
        }
      });

      document.dispatchEvent(new CustomEvent("cart:refresh", { detail: { cart } }));
      document.dispatchEvent(new CustomEvent("cartcount:update", { detail: { count } }));
      document.dispatchEvent(new CustomEvent("ajaxProduct:added", { detail: { cart } }));

      if (typeof window.fetchCart === "function") window.fetchCart();
      if (typeof window.updateCart === "function") window.updateCart();
      if (typeof window.refreshCart === "function") window.refreshCart();
    } catch (err) { }

    // ----- TIER 3: Open drawer if supported -----
    if (!handledByThemeDrawer) {
      const toggle =
        document.querySelector('[data-cart-toggle]') ||
        document.querySelector('[data-drawer-toggle]') ||
        document.querySelector('.js-cart-toggle') ||
        document.querySelector('.js-drawer-open-cart') ||
        document.querySelector('[aria-controls="CartDrawer"]') ||
        document.querySelector('#cart-icon-bubble');

      toggle?.dispatchEvent(new Event("click", { bubbles: true }));
    }
  }



  /* =========================================
     STICKY BAR INITIALISATION
     ========================================= */
  function initStickyBar() {
    const root = document.getElementById("bdm-sticky-atc-bar-root");
    if (!root) return;

    const productForm = document.querySelector('form[action*="/cart/add"]');
    if (!productForm) return;

    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    const productTitle = root.dataset.productTitle || document.title;

    let variants = window.ShopifyAnalytics?.meta?.product?.variants || [];
    const hasVariants = variants.length > 1;

    let currentVariantId = window.BDMStickyATC.currentVariantId ||
      variants[0]?.id;

    // Format price
    const findVariantById = (id) =>
      variants.find((v) => String(v.id) === String(id));

    const formatMoney = (cents) =>
      (cents / 100).toLocaleString(undefined, {
        style: "currency",
        currency: Shopify?.currency?.active || "USD",
      });

    let currentPrice = findVariantById(currentVariantId)?.price;

    // Build bar
    const bar = document.createElement("div");
    bar.className = "bdm-sticky-atc-bar-container";

    const inner = document.createElement("div");
    inner.className = "bdm-sticky-atc-bar-inner";

    const productInfo = document.createElement("div");
    productInfo.className = "bdm-sticky-atc-product";

    const titleEl = document.createElement("div");
    titleEl.className = "bdm-sticky-atc-title";
    titleEl.textContent = productTitle;

    const priceEl = document.createElement("div");
    priceEl.className = "bdm-sticky-atc-price";
    priceEl.textContent = formatMoney(currentPrice);

    productInfo.append(titleEl, priceEl);

    // Variant select
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
        if (v) {
          currentPrice = v.price;
          priceEl.textContent = formatMoney(currentPrice);
        }

        // Sync main form
        const sel = productForm.querySelector('select[name="id"]');
        if (sel) {
          sel.value = currentVariantId;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
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

      // Listen to universal variant changes
      document.addEventListener("BDM:variantChanged", (e) => {
        const newId = e.detail.variantId;
        if (!newId) return;

        currentVariantId = newId;
        select.value = newId;

        const v = findVariantById(newId);
        if (v) priceEl.textContent = formatMoney(v.price);
      });
    }

    // Quantity
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

    // ATC button
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

      if (!res.ok) {
        alert("Could not add to cart. Please try again.");
        return;
      }

      updateCartIconAndDrawer();
    });

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

    // Auto refresh cart when external ATC occurs
    document.addEventListener("BDM:addedToCart", updateCartIconAndDrawer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStickyBar);
  } else {
    initStickyBar();
  }
})();
