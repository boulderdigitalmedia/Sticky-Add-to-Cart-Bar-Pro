// Sticky Add to Cart Bar (Responsive Desktop + Mobile Optimized)
(function () {

  /* ---------------------------
      CART UPDATE HANDLER
  ---------------------------- */
  function updateCartIconAndDrawer() {
    document.dispatchEvent(new CustomEvent("cart:refresh"));
    if (window.fetchCart) window.fetchCart();
    if (window.updateCart) window.updateCart();

    fetch("/cart.js")
      .then(res => res.json())
      .then(cart => {
        const els = document.querySelectorAll(".cart-count, .cart-count-bubble, [data-cart-count]");
        els.forEach(el => {
          el.textContent = cart.item_count;
          el.dataset.cartCount = cart.item_count;
        });
      })
      .catch(() => {});
  }

  /* ---------------------------
      INITIALIZE STICKY BAR
  ---------------------------- */
  function initStickyBar() {
    const root = document.getElementById("bdm-sticky-atc-bar-root");
    if (!root) return;

    const productForm = document.querySelector('form[action*="/cart/add"]');
    if (!productForm) return;

    const productTitle = root.dataset.productTitle;
    let variants = window.ShopifyAnalytics?.meta?.product?.variants || [];
    const variantSelect = productForm.querySelector("select[name='id']");
    let currentVariantId = variantSelect ? variantSelect.value : variants[0]?.id;

    const findVariantById = id =>
      variants.find(v => String(v.id) === String(id));

    const formatMoney = cents =>
      (cents / 100).toLocaleString(undefined, {
        style: "currency",
        currency: Shopify.currency.active,
      });

    let currentPrice = findVariantById(currentVariantId)?.price;

    /* ---------------------------
        BAR STRUCTURE
    ---------------------------- */
    const bar = document.createElement("div");
    bar.className = "bdm-sticky-atc-bar-container";

    const inner = document.createElement("div");
    inner.className = "bdm-sticky-atc-bar-inner";

    /* ---------------------------
        PRODUCT INFO (DESKTOP)
        Mobile will hide title if variants exist
    ---------------------------- */
    const productInfo = document.createElement("div");
    productInfo.className = "bdm-sticky-atc-product";

    productInfo.innerHTML = `
      <div class="bdm-sticky-atc-title">${productTitle}</div>
      <div class="bdm-sticky-atc-price">${formatMoney(currentPrice)}</div>
    `;

    /* ---------------------------
        CONTROLS WRAPPER
    ---------------------------- */
    const controls = document.createElement("div");
    controls.className = "bdm-sticky-atc-controls";

    /* ---------------------------
        VARIANT SELECTOR
        Shows above qty on mobile
        Shows inline on desktop
    ---------------------------- */
    const variantWrapper = document.createElement("div");
    variantWrapper.className = "bdm-sticky-atc-variant";

    const hasVariants = variants.length > 1;

    if (hasVariants) {
      const select = document.createElement("select");
      select.className = "bdm-sticky-atc-variant-select";

      variants.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = v.public_title || v.title;
        select.appendChild(opt);
      });

      select.value = currentVariantId;

      select.addEventListener("change", () => {
        currentVariantId = select.value;
        const v = findVariantById(currentVariantId);
        currentPrice = v.price;

        productInfo.querySelector(".bdm-sticky-atc-price").textContent =
          formatMoney(currentPrice);

        if (variantSelect) {
          variantSelect.value = currentVariantId;
          variantSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      variantWrapper.appendChild(select);
    }

    /* ---------------------------
        QUANTITY SELECTOR
    ---------------------------- */
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

    minusBtn.onclick = () =>
      (qtyInput.value = Math.max(1, Number(qtyInput.value) - 1));

    plusBtn.onclick = () =>
      (qtyInput.value = Number(qtyInput.value) + 1);

    qtyWrapper.append(minusBtn, qtyInput, plusBtn);

    /* ---------------------------
        ADD TO CART BUTTON
    ---------------------------- */
    const atcButton = document.createElement("button");
    atcButton.className = "bdm-sticky-atc-button";
    atcButton.textContent = "Add to cart";

    atcButton.addEventListener("click", async () => {
      const res = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          id: currentVariantId,
          quantity: Number(qtyInput.value),
        }),
      });

      if (res.ok) updateCartIconAndDrawer();
    });

    /* ---------------------------
        ASSEMBLE
    ---------------------------- */
    controls.append(variantWrapper, qtyWrapper, atcButton);
    inner.append(productInfo, controls);
    bar.appendChild(inner);
    document.body.appendChild(bar);

    /* ---------------------------
       MOBILE RULE: HIDE TITLE IF VARIANTS EXIST
    ---------------------------- */
    if (window.matchMedia("(max-width: 768px)").matches && hasVariants) {
      productInfo.querySelector(".bdm-sticky-atc-title").style.display = "none";
    }
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", initStickyBar)
    : initStickyBar();

})();
