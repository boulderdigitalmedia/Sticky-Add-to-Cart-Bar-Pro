// Sticky Add to Cart Bar JS with Universal Cart Refresh + Clean Round Incrementer
(function () {
  /* ---------------------------
      CART UPDATE HANDLER
  ---------------------------- */
  function updateCartIconAndDrawer() {
    document.dispatchEvent(new CustomEvent('cart:refresh'));

    if (window.fetchCart) window.fetchCart();
    if (window.updateCart) window.updateCart();

    // Direct Shopify cart.json update (safe fallback)
    fetch('/cart.js')
      .then(res => res.json())
      .then(cart => {
        const cartCountEls = document.querySelectorAll(
          '.cart-count, .cart-count-bubble, [data-cart-count]'
        );

        cartCountEls.forEach(el => {
          el.textContent = cart.item_count;
          el.dataset.cartCount = cart.item_count;
        });

        document.dispatchEvent(
          new CustomEvent('cartcount:update', {
            detail: { count: cart.item_count }
          })
        );
      })
      .catch(err => console.error('Error updating cart count', err));

    // Try to open AJAX drawer on support themes
    const toggles = document.querySelectorAll(
      '[data-cart-toggle], [data-drawer-toggle], [aria-controls="CartDrawer"], .js-cart-toggle'
    );
    if (toggles.length) toggles[0].click();
  }

  /* ---------------------------
      MAIN INITIALIZER
  ---------------------------- */
  function initStickyBar() {
    const root = document.getElementById('bdm-sticky-atc-bar-root');
    if (!root) return;

    const productTitle = root.dataset.productTitle || document.title;
    const productForm = document.querySelector('form[action*="/cart/add"]');
    if (!productForm) return;

    let variants =
      (window.ShopifyAnalytics?.meta?.product?.variants) || [];

    const variantSelect = productForm.querySelector('select[name="id"]');
    let currentVariantId = variantSelect ? variantSelect.value : variants[0]?.id;

    const findVariant = id =>
      variants.find(v => String(v.id) === String(id));

    const formatMoney = cents =>
      ((cents || 0) / 100).toLocaleString(undefined, {
        style: 'currency',
        currency: Shopify.currency.active
      });

    // Current price
    let currentPrice = findVariant(currentVariantId)?.price;

    /* ---------------------------
        BUILD BAR
    ---------------------------- */
    const bar = document.createElement('div');
    bar.className = 'bdm-sticky-atc-bar-container';

    const inner = document.createElement('div');
    inner.className = 'bdm-sticky-atc-bar-inner';

    /* PRODUCT INFO */
    const productInfo = document.createElement('div');
    productInfo.className = 'bdm-sticky-atc-product';
    productInfo.innerHTML = `
      <div class="bdm-sticky-atc-title">${productTitle}</div>
      <div class="bdm-sticky-atc-price">
        ${currentPrice ? formatMoney(currentPrice) : ''}
      </div>
    `;

    /* CONTROLS */
    const controls = document.createElement('div');
    controls.className = 'bdm-sticky-atc-controls';

    /* VARIANT SELECTOR */
    const variantWrapper = document.createElement('div');
    variantWrapper.className = 'bdm-sticky-atc-variant';

    if (variants.length > 1) {
      const select = document.createElement('select');
      variants.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent =
          v.public_title || v.title || `Variant ${v.id}`;
        if (String(v.id) === String(currentVariantId)) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        currentVariantId = select.value;
        const v = findVariant(currentVariantId);
        const priceEl =
          productInfo.querySelector('.bdm-sticky-atc-price');

        if (priceEl && v?.price) {
          priceEl.textContent = formatMoney(v.price);
        }

        if (variantSelect) {
          variantSelect.value = currentVariantId;
          variantSelect.dispatchEvent(
            new Event('change', { bubbles: true })
          );
        }
      });

      variantWrapper.appendChild(select);
    }

    /* QUANTITY SELECTOR — ROUND BUTTONS */
    const qtyWrapper = document.createElement('div');
    qtyWrapper.className = 'bdm-sticky-atc-qty';

    const minusBtn = document.createElement('button');
    minusBtn.textContent = '−';

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.value = '1';

    const plusBtn = document.createElement('button');
    plusBtn.textContent = '+';

    minusBtn.onclick = () =>
      (qtyInput.value = Math.max(1, Number(qtyInput.value) - 1));

    plusBtn.onclick = () =>
      (qtyInput.value = Math.max(1, Number(qtyInput.value) + 1));

    qtyWrapper.append(minusBtn, qtyInput, plusBtn);

    /* ADD TO CART BUTTON */
    const atcButton = document.createElement('button');
    atcButton.className = 'bdm-sticky-atc-button';
    atcButton.textContent = 'Add to cart';

    atcButton.addEventListener('click', async () => {
      const quantity = Math.max(1, Number(qtyInput.value));
      const variantId = currentVariantId;

      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ id: variantId, quantity })
      });

      if (!res.ok) {
        alert('Could not add to cart');
        return;
      }

      updateCartIconAndDrawer();
    });

    /* APPEND ELEMENTS */
    controls.append(variantWrapper, qtyWrapper, atcButton);
    inner.append(productInfo, controls);
    bar.appendChild(inner);
    document.body.appendChild(bar);
  }

  /* ---------------------------
      START
  ---------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStickyBar);
  } else {
    initStickyBar();
  }
})();
