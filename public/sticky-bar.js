(function() {
  // ======= Sticky Bar Container =======
  const bar = document.createElement('div');
  bar.id = 'sticky-add-to-cart-bar';
  bar.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: #ff6f61;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    z-index: 9999;
    box-shadow: 0 -2px 5px rgba(0,0,0,0.2);
    font-family: sans-serif;
  `;

  // ======= Quantity Controls =======
  const minusBtn = document.createElement('button');
  minusBtn.innerText = '−';
  minusBtn.style.cssText = 'padding:5px 10px; margin-right:5px; font-size:18px; cursor:pointer;';

  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.value = 1;
  qtyInput.min = 1;
  qtyInput.style.cssText = 'width:50px; text-align:center; margin-right:5px;';

  const plusBtn = document.createElement('button');
  plusBtn.innerText = '+';
  plusBtn.style.cssText = 'padding:5px 10px; margin-right:15px; font-size:18px; cursor:pointer;';

  // ======= Add to Cart Button =======
  const addBtn = document.createElement('button');
  addBtn.innerText = 'Add to Cart';
  addBtn.style.cssText = `
    padding: 8px 20px;
    background: #fff;
    color: #ff6f61;
    border: none;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
  `;

  // Append controls to bar
  bar.appendChild(minusBtn);
  bar.appendChild(qtyInput);
  bar.appendChild(plusBtn);
  bar.appendChild(addBtn);
  document.body.appendChild(bar);

  // ======= Increment / Decrement =======
  minusBtn.addEventListener('click', () => {
    let val = parseInt(qtyInput.value, 10);
    if (val > 1) qtyInput.value = val - 1;
  });

  plusBtn.addEventListener('click', () => {
    let val = parseInt(qtyInput.value, 10);
    qtyInput.value = val + 1;
  });

  // ======= AJAX Add to Cart =======
  addBtn.addEventListener('click', function() {
    const qty = parseInt(qtyInput.value, 10);

    // Try to find the variant ID from the page
    let variantInput = document.querySelector('form[action^="/cart/add"] input[name="id"]');
    if (!variantInput) {
      alert('Product variant not found!');
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
      addBtn.innerText = 'Added!';
      setTimeout(() => { addBtn.innerText = 'Add to Cart'; }, 1500);
    })
    .catch(err => {
      console.error(err);
      alert('Error adding to cart.');
    });
  });

  // ======= Optional: Hide bar on non-product pages =======
  if (!window.location.pathname.includes('/products/')) {
    bar.style.display = 'none';
  }
})();
