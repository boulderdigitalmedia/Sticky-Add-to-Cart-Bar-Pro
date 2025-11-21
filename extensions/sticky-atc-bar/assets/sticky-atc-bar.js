// Sticky Add to Cart Bar JS (mobile optimized, desktop preserved)
(function () {
  function updateCartIconAndDrawer() {
    document.dispatchEvent(new CustomEvent("cart:refresh"));
    if (window.fetchCart) window.fetchCart();
    if (window.updateCart) window.updateCart();

    fetch("/cart.js")
      .then(res => res.json())
      .then(cart => {
        document.querySelectorAll(".cart-count, .cart-count-bubble, [data-cart-count]")
          .forEach(el => {
            el.textContent = cart.item_count;
            el.dataset.cartCount = cart.item_count;
          });
      });
  }

  function initStickyBar() {
    const root = document.getElementById("bdm-sticky-atc-bar-root");
    if (!root) return;

    const productForm = document.querySelector('form[action*="/cart/add"]');
    if (!productForm) return;

    let variants = window.ShopifyAnalytics?.meta?.product?.variants || [];
    const variantSelect = productForm.querySelector("select[name='id']");
    let currentVariantId = variantSelect ? variantSelect.value : variants[0]?.id;

    const findVariantById = id => variants.find(v => String(v.id) === String(id));
    const formatMoney = cents =>
      (cents / 100).toLocaleString(undefined, {
        style: "currency",
        currency: Shopify.currency.active
      });

    let currentPrice = findVariantById(currentVariantId)?.price;
    const titleText = root.dataset.productTitle;

    /* BAR CONTAINER */
    const bar = document.createElement("div");
    bar.className = "bdm-sticky-atc-bar-container";

    const inner = document.createElement("div");
    inner.className = "bdm-sticky-atc-bar-inner";

    /* PRODUCT INFO */
    const productInfo = document.createElement("div");
    productInfo.className = "bdm-sticky-atc-product";

    const titleEl = document.createElement("div");
    titleEl.className = "bdm-sticky-atc-title";
    titleEl.textContent = titleText;

    const priceEl = document.createElement("div");
    priceEl.className = "bdm-sticky-atc-price";
    priceEl.textContent = formatMoney(currentPrice);

    productInfo.append(titleEl, priceEl);

    /* CONTROLS WRAPPER */
    const controls = document.createElement("div");
    controls.className = "bdm-sticky-atc-controls";

    /* VARIANT SELECTOR */
    const variantWrapper = document.createElement("div");

    if (variants.length > 1) {
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

        if (v) {
          currentPrice = v.price;
          priceEl.textContent = formatMoney(v.price);
        }

        // sync original Shopify variant form
        if (variantSelect) {
          variantSelect.value = currentVariantId;
          variantSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });

      variantWrapper.append(select);

      // MOBILE: hide title when variants exist
      titleEl.classList.add("bdm-hide-title-mobile");
    }

    /* QUANTITY CONTROL */
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

    minusBtn.onclick = () => qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
    plusBtn.onclick = () => qtyInput.value = Number(qtyInput.value) + 1;

    qtyWrapper.append(minusBtn, qtyInput, plusBtn);

    /* ADD TO CART */
    const atcButton = document.createElement("button");
    atcButton.className = "bdm-sticky-atc-button";
    atcButton.textContent = "Add to cart";

    atcButton.addEventListener("click", async () => {
      const res = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          id: currentVariantId,
          quantity: Number(qtyInput.value)
        })
      });

      if (res.ok) updateCartIconAndDrawer();
    });

    /* FINAL ASSEMBLY */
    controls.append(variantWrapper, qtyWrapper, atcButton);
    inner.append(productInfo, controls);
    bar.appendChild(inner);
    document.body.appendChild(bar);
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", initStickyBar)
    : initStickyBar();
})();
