// Sticky Add to Cart Bar JS – desktop + mobile optimized
(function () {
  /* ------------ CART UPDATE ------------ */
  function updateCartIconAndDrawer() {
    document.dispatchEvent(new CustomEvent('cart:refresh'));
    if (window.fetchCart) window.fetchCart();
    if (window.updateCart) window.updateCart();

    fetch('/cart.js')
      .then(res => res.json())
      .then(cart => {
        const els = document.querySelectorAll(
          '.cart-count, .cart-count-bubble, [data-cart-count]'
        );
        els.forEach(el => {
          el.textContent = cart.item_count;
          el.dataset.cartCount = cart.item_count;
        });
      })
      .catch(console.error);
  }

  /* ------------ MAIN INIT ------------ */
  function initStickyBar() {
    const root = document.getElementById('bdm-sticky-atc-bar-root');
    if (!root) return;

    const productForm = document.querySelector('form[action*="/cart/add"]');
    if (!productForm) return;

    const productTitle = root.dataset.productTitle || document.title;

    let variants = window.ShopifyAnalytics?.meta?.product?.variants || [];
    const variantSelect = productForm.querySelector("select[name='id']");

    let currentVariantId = variantSelect
      ? variantSelect.value
      : variants[0]?.id;

    const findVariantById = id =>
      variants.find(v => String(v.id) === String(id));

    const getCurrency = () => Shopify?.currency?.active || 'USD';

    const formatMoney = cents => {
      if (typeof cents !== 'number') return '';
      return (cents / 100).toLocaleString(undefined, {
        style: 'currency',
        currency: getCurrency(),
      });
    };

    let currentPrice = findVariantById(currentVariantId)?.price;

    /* ------------ BAR CONTAINER ------------ */
    const bar = document.createElement('div');
    bar.className = 'bdm-sticky-atc-bar-container';

    const inner = document.createElement('div');
    inner.className = 'bdm-sticky-atc-bar-inner';

    /* ------------ PRODUCT INFO (TITLE ONLY) ------------ */
    const productInfo = document.createElement('div');
    productInfo.className = 'bdm-sticky-atc-product';
    productInfo.innerHTML = `
      <div class="bdm-sticky-atc-title">${productTitle}</div>
    `;

    /* ------------ CONTROLS WRAPPER ------------ */
    const controls = document.createElement('div');
    controls.className = 'bdm-sticky-atc-controls';

    // Top row: Variant selector + price
    const topRow = document.createElement('div');
    topRow.className = 'bdm-sticky-atc-top-row';

    const variantWrapper = document.createElement('div');
    variantWrapper.className = 'bdm-sticky-atc-variant';

    const priceEl = document.createElement('div');
    priceEl.className = 'bdm-sticky-atc-price';
    priceEl.textContent = formatMoney(currentPrice);

    if (variants.length > 1) {
      const mobileSelect = document.createElement('select');
      mobileSelect.className = 'bdm-sticky-atc-variant-select';

      variants.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = v.public_title || v.title || `Variant ${v.id}`;
        if (String(v.id) === String(currentVariantId)) opt.selected = true;
        mobileSelect.appendChild(opt);
      });

      mobileSelect.addEventListener('change', () => {
        currentVariantId = mobileSelect.value;
        const v = findVariantById(currentVariantId);
        currentPrice = v?.price;

        priceEl.textContent = formatMoney(currentPrice);

        if (variantSelect) {
          variantSelect.value = currentVariantId;
          variantSelect.dispatchEvent(
            new Event('change', { bubbles: true })
          );
        }
      });

      variantWrapper.appendChild(mobileSelect);
    }

    topRow.append(variantWrapper, priceEl);

    /* ------------ BOTTOM ROW: QTY + BUTTON ------------ */
    const bottomRow = document.createElement('div');
    bottomRow.className = 'bdm-sticky-atc-bottom-row';

    const qtyWrapper = document.createElement('div');
    qtyWrapper.className = 'bdm-sticky-atc-qty';

    const minusBtn = document.createElement('button');
    minusBtn.className = 'bdm-qty-btn';
    minusBtn.textContent = '−';

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.value = '1';
    qtyInput.className = 'bdm-qty-input';

    const plusBtn = document.createElement('button');
    plusBtn.className = 'bdm-qty-btn';
    plusBtn.textContent = '+';

    minusBtn.addEventListener('click', () => {
      qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
    });

    plusBtn.addEventListener('click', () => {
      qtyInput.value = Math.max(1, Number(qtyInput.value) + 1);
    });

    qtyWrapper.append(minusBtn, qtyInput, plusBtn);

    const atcButton = document.createElement('button');
    atcButton.className = 'bdm-sticky-atc-button';
    atcButton.textContent = 'Add to cart';

    atcButton.addEventListener('click', async () => {
      const variantIdToUse =
        currentVariantId || variantSelect?.value || variants[0]?.id;

      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          id: variantIdToUse,
          quantity: Math.max(1, Number(qtyInput.value)),
        }),
      });

      if (res.ok) {
        updateCartIconAndDrawer();
      } else {
        console.error('Add to cart failed', await res.text());
        alert('Could not add to cart');
      }
    });

    bottomRow.append(qtyWrapper, atcButton);

    controls.append(topRow, bottomRow);

    /* ------------ ASSEMBLE BAR ------------ */
    inner.append(productInfo, controls);
    bar.appendChild(inner);
    document.body.appendChild(bar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStickyBar);
  } else {
    initStickyBar();
  }
})();
