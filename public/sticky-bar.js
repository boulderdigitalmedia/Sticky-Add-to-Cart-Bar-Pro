(function() {
  // Create the sticky bar container
  const bar = document.createElement('div');
  bar.id = 'sticky-add-to-cart-bar';
  bar.style.cssText = `
    position: fixed; bottom: 0; left: 0; width: 100%;
    background: #ff6f61; color: white; text-align: center;
    padding: 10px; z-index: 9999;
    display: flex; justify-content: center; align-items: center;
  `;

  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.value = 1;
  qtyInput.min = 1;
  qtyInput.style.width = '50px';
  qtyInput.style.marginRight = '10px';

  const addBtn = document.createElement('button');
  addBtn.innerText = 'Add to Cart';
  addBtn.style.padding = '5px 15px';
  addBtn.style.cursor = 'pointer';

  bar.appendChild(qtyInput);
  bar.appendChild(addBtn);
  document.body.appendChild(bar);

  // AJAX Add to Cart
  addBtn.addEventListener('click', function() {
    const qty = parseInt(qtyInput.value, 10);
    const form = document.querySelector('form[action^="/cart/add"]');

    if (!form) {
      alert('Add-to-cart form not found!');
      return;
    }

    const variantInput = form.querySelector('input[name="id"]');
    if (!variantInput) {
      alert('Variant ID not found!');
      return;
    }

    const variantId = variantInput.value;

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: qty })
    })
    .then(res => res.json())
    .then(data => {
      // Optional: show confirmation
      addBtn.innerText = 'Added!';
      setTimeout(() => { addBtn.innerText = 'Add to Cart'; }, 1500);
    })
    .catch(err => {
      console.error(err);
      alert('Error adding to cart.');
    });
  });
})();
