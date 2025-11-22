// Sticky Add to Cart Bar – Desktop vA + Compact Mobile (Universal Cart Refresh)
(function () {
  /* =========================================
     UNIVERSAL CART REFRESH
     ========================================= */
  function updateCartIconAndDrawer() {
    (async () => {
      // 1) Always update counts from /cart.js
      let cart = null;
      try {
        cart = await fetch("/cart.js").then((res) => res.json());
        const count = cart.item_count;

        const countEls = document.querySelectorAll(
          ".cart-count, .cart-count-bubble, [data-cart-count]"
        );

        countEls.forEach((el) => {
          el.textContent = count;
          el.dataset.cartCount = count;

          // Handle themes that hide the bubble when count is 0
          if (count > 0) {
            el.removeAttribute("hidden");
            el.setAttribute("aria-hidden", "false");
            el.classList.remove("is-empty");
          } else {
            el.setAttribute("aria-hidden", "true");
            el.classList.add("is-empty");
          }
        });

        // Fire some common events themes may hook into
        document.dispatchEvent(
          new CustomEvent("cart:refresh", { detail: { cart } })
        );
        document.dispatchEvent(
          new CustomEvent("cartcount:update", { detail: { count } })
        );
        document.dispatchEvent(
          new CustomEvent("ajaxProduct:added", { detail: { cart } })
        );
      } catch (err) {
        console.warn("Error updating cart counts:", err);
      }

      // 2) Try theme-specific helpers if they exist
      try {
        if (typeof window.fetchCart === "function") window.fetchCart();
        if (typeof window.updateCart === "function") window.updateCart();
      } catch (err) {
        console.warn("Error calling theme cart helpers:", err);
      }

      // 3) Try Online Store 2.0 sections for drawer & icon
      try {
        const rootPath =
          (window.Shopify &&
            window.Shopify.routes &&
            window.Shopify.routes.root) ||
          "/";
        const sectionHandles = [
          "cart-drawer",
          "cart-icon-bubble",
          "cart",
          "mini-cart",
          "cart-items"
        ];

        const sectionsRes = await fetch(
          `${rootPath}?sections=${sectionHandles.join(",")}`
        );

        let sectionsJson = null;
        try {
          sectionsJson = await sectionsRes.json();
        } catch (e) {
          // Theme may not support ?sections=; just skip
        }

        if (sectionsJson) {
          const cartDrawerEl = document.querySelector("cart-drawer");

          // Prefer your theme's CartDrawer.renderContents if available
          if (
            cartDrawerEl &&
            typeof cartDrawerEl.renderContents === "function"
          ) {
            const parsedState = {
              id: Date.now(),
              sections: sectionsJson
            };
            cartDrawerEl.renderContents(parsedState);
          } else {
            // Generic: swap out bits of DOM based on section IDs
            Object.keys(sectionsJson).forEach((key) => {
              const html = sectionsJson[key];
              if (!html) return;

              const temp = document.createElement("div");
              temp.innerHTML = html;

              // Try to find an element in the new HTML
              const newSectionEl =
                temp.querySelector(`#${key}`) ||
                temp.querySelector(`[data-section-id="${key}"]`) ||
                temp.querySelector(`[data-section-type="${key}"]`) ||
                temp.firstElementChild;

              if (!newSectionEl) return;

              // Try to find matching target in current DOM
              const currentSectionEl =
                document.querySelector(`#${key}`) ||
                document.querySelector(`[data-section-id="${key}"]`) ||
                document.querySelector(`[data-section-type="${key}"]`);

              if (currentSectionEl) {
                currentSectionEl.innerHTML = newSectionEl.innerHTML;
              }
            });
          }
        }
      } catch (err) {
        console.warn("Error updating cart sections:", err);
      }

      // 4) Try to open the cart drawer / mini-cart if the theme has one
      try {
        const toggle = document.querySelector(
          '#cart-icon-bubble, [data-cart-toggle], [data-drawer-toggle], .js-cart-toggle, .js-drawer-open-cart, [aria-controls="CartDrawer"]'
        );
        if (toggle) {
          toggle.dispatchEvent(new Event("click", { bubbles: true }));
        }
      } catch (err) {
        console.warn("Error opening cart drawer:", err);
      }
    })();
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

    const variantSelectOnPage = productForm.querySelector("select[name='id']");
    let currentVariantId = variantSelectOnPage
      ? variantSelectOnPage.value
      : variants[0]?.id;

    // Fallback for single-variant products
    if (!currentVariantId) {
      const fallback = productForm.querySelector("[name='id']");
      if (fallback) currentVariantId = fallback.value;
    }

    const findVariantById = (id) =>
      variants.find((v) => String(v.id) === String(id));

    const formatMoney = (cents) => {
      const safe = typeof cents === "number" ? cents : 0;
      return (safe / 100).toLocaleString(undefined, {
        style: "currency",
        currency: Shopify?.currency?.active || "USD",
      });
    };

    let currentPrice = findVariantById(currentVariantId)?.price;

    // ========= BAR CONTAINER =========
    const bar = document.createElement("div");
    bar.className = "bdm-sticky-atc-bar-container";

    const inner = document.createElement("div");
    inner.className = "bdm-sticky-atc-bar-inner";

    // ========= PRODUCT INFO (Title + Price) =========
    const productInfo = document.createElement("div");
    productInfo.className = "bdm-sticky-atc-product";

    const titleEl = document.createElement("div");
    titleEl.className = "bdm-sticky-atc-title";
    titleEl.textContent = productTitle;

    const priceEl = document.createElement("div");
    priceEl.className = "bdm-sticky-atc-price";
    priceEl.textContent = formatMoney(currentPrice);

    productInfo.appendChild(titleEl);
    productInfo.appendChild(priceEl);

    // ========= VARIANT SELECTOR =========
    const variantWrapper = document.createElement("div");
    variantWrapper.className = "bdm-sticky-atc-variant";

    if (hasVariants) {
      const select = document.createElement("select");
      select.className = "bdm-sticky-atc-variant-select";

      variants.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = v.public_title || v.title || `Variant ${v.id}`;
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

        // Sync native product form
        if (variantSelectOnPage) {
          variantSelectOnPage.value = currentVariantId;
          variantSelectOnPage.dispatchEvent(
            new Event("change", { bubbles: true })
          );
        }
      });

      // Desktop: variant selector in controls row
      // Mobile: variant selector goes where the title was (to save vertical space)
      if (isMobile) {
        titleEl.style.display = "none"; // hide title on mobile when variants exist
        const mobileVariantRow = document.createElement("div");
        mobileVariantRow.className = "bdm-variant-mobile-row";
        mobileVariantRow.appendChild(select);
        // Insert variant row where title was
        productInfo.insertBefore(mobileVariantRow, priceEl);
      } else {
        variantWrapper.appendChild(select);
      }
    }

    // ========= QUANTITY CONTROLS =========
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

    minusBtn.addEventListener("click", () => {
      qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
    });

    plusBtn.addEventListener("click", () => {
      qtyInput.value = Number(qtyInput.value) + 1;
    });

    qtyWrapper.append(minusBtn, qtyInput, plusBtn);

    // ========= ADD TO CART BUTTON =========
    const atcButton = document.createElement("button");
    atcButton.className = "bdm-sticky-atc-button";
    atcButton.textContent = "Add to cart";

    atcButton.addEventListener("click", async () => {
      // Final safety fallback
      if (!currentVariantId) {
        const fallback = productForm.querySelector("[name='id']");
        if (fallback) currentVariantId = fallback.value;
      }
      if (!currentVariantId) {
        alert("Unable to determine variant.");
        return;
      }

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
        console.error("Cart add error", await res.text());
        alert("Could not add to cart. Please try again.");
        return;
      }

      // Universal refresh
      updateCartIconAndDrawer();
    });

    // ========= CONTROLS LAYOUT =========
    const controls = document.createElement("div");
    controls.className = "bdm-sticky-atc-controls";

    if (!isMobile && hasVariants) {
      // Desktop Version A: variant + qty + button
      controls.append(variantWrapper, qtyWrapper, atcButton);
    } else {
      // Mobile (variant already moved up) or no variants
      controls.append(qtyWrapper, atcButton);
    }

    inner.append(productInfo, controls);
    bar.appendChild(inner);
    document.body.appendChild(bar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStickyBar);
  } else {
    initStickyBar();
  }
})();
