(async function() {
  // Get product JSON
  const jsonScript = document.querySelector('script[type="application/json"][id^="ProductJson"]');
  if (!jsonScript) return;

  const product = JSON.parse(jsonScript.innerHTML);
  if (!product || !product.variants) return;

  const bar = document.createElement("div");
  bar.id = "sticky-add-to-cart";
  bar.style = `
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: #333;
    color: #fff;
    padding: 15px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    z-index: 9999;
    font-family: sans-serif;
  `;

  const variantSelect = document.createElement("select");
  product.variants.forEach(v => {
    const option = document.createElement("option");
    option.value = v.id;
    option.textContent = v.title + (v.available ? "" : " (Sold Out)");
    option.disabled = !v.available;
    variantSelect.appendChild(option);
  });
  bar.appendChild(variantSelect);

  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.min = 1;
  qtyInput.value = 1;
  qtyInput.style.width = "50px";
  bar.appendChild(qtyInput);

  const addButton = document.createElement("button");
  addButton.textContent = "Add to Cart";
  addButton.style = "background:#ff6f61;color:#fff;border:none;padding:8px 15px;cursor:pointer;";
  bar.appendChild(addButton);

  document.body.appendChild(bar);

  const cartIndicator = document.createElement("span");
  cartIndicator.style.marginLeft = "10px";
  bar.appendChild(cartIndicator);

  async function updateCart() {
    const res = await fetch("/cart.js");
    const data = await res.json();
    cartIndicator.textContent = `Cart: ${data.item_count} item${data.item_count !== 1 ? "s" : ""}`;
  }

  await updateCart();

  addButton.addEventListener("click", async () => {
    const variantId = variantSelect.value;
    const quantity = parseInt(qtyInput.value, 10) || 1;
    await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: variantId, quantity })
    });
    await updateCart();
    alert(`Added ${quantity} item${quantity !== 1 ? "s" : ""} to cart`);
  });
})();
