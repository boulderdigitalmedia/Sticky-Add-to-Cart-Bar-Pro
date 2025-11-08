document.addEventListener('DOMContentLoaded', async () => {
  const productElement = document.querySelector('[data-product-id]');
  let productHandle = null;

  // Try to get the product handle from the meta tags or URL
  const metaHandle = document.querySelector('meta[property="og:url"]');
  if (metaHandle) {
    const url = new URL(metaHandle.content);
    productHandle = url.pathname.split('/').pop();
  }

  // Fallback if the handle is not found
  if (!productHandle && window.location.pathname.includes('/products/')) {
    productHandle = window.location.pathname.split('/products/')[1];
  }

  if (!productHandle) {
    console.warn('Sticky Bar: Could not determine product handle.');
    return;
  }

  try {
    // Fetch product JSON from Shopify (always available)
    const res = await fetch(`/products/${productHandle}.js`);
    const product = await res.json();

    // Create sticky bar container
    const bar = document.createElement('div');
    bar.id = 'sticky-bar';
    bar.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      background: #fff;
      border-top: 1px solid #ddd;
      box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      z-index: 9999;
      font-family: sans-serif;
    `;

    const title = document.createElement('span');
    title.textContent = product.title;

    // --- Variant selector ---
    const variantSelect = document.createElement('select');
    product.variants.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.title + (v.available ? '' : ' (Sold out)');
      opt.disabled = !v.available;
      variantSelect.appendChild(opt);
    });

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add to Cart';
    addBtn.style.cssText = `
      background: #1a73e8;
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 15px;
    `;

    addBtn.addEventListener('click', async () => {
      const variantId = variantSelect.value;
      const quantity = 1;

      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity })
      });

      if (response.ok) {
        addBtn.textContent = 'Added!';
        setTimeout(() => (addBtn.textContent = 'Add to Cart'), 1500);
      } else {
        alert('There was an issue adding to the cart.');
      }
    });

    bar.appendChild(title);
    bar.appendChild(variantSelect);
    bar.appendChild(addBtn);
    document.body.appendChild(bar);
  } catch (err) {
    console.error('Sticky Bar Error:', err);
  }
});
