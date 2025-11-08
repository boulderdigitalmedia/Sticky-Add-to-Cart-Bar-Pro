(function() {
  if (document.getElementById("sticky-add-to-cart-bar")) return;

  // Detect product variant ID
  let productId = null;

  // 1️⃣ Try meta tag
  const metaVariant = document.querySelector('meta[name="product-id"]');
  if (metaVariant) productId = metaVariant.content;

  // 2️⃣ Try Add to Cart form hidden input
  if (!productId) {
    const formInput = document.querySelector('form[action="/cart/add"] input[name="id"]');
    if (formInput) productId = formInput.value;
  }

  if (!productId) {
    console.warn("Sticky Bar: Cannot find variant ID. Bar will not show.");
    return;
  }

  // Detect product title
  const title =
    document.querySelector('meta[property="og:title"]')?.content ||
    document.querySelector('h1')?.innerText ||
    "Product";

  // Detect price
  const price =
    document.querySelector('meta[property="product:price:amount"]')?.content ||
    document.querySelector('[class*="price"]')?.innerText.replace(/[^\d.]/g, "") ||
    "";

  // Build sticky bar
  const bar = document.createElement("div");
  bar.id = "sticky-add-to-cart-bar";
  bar.style.position = "fixed";
  bar.style.bottom = "0";
  bar.style.left = "0";
  bar.style.width = "100%";
  bar.style.backgroundColor = "#2a9d8f";
  bar.style.color = "#fff";
  bar.style.display = "flex";
  bar.style.justifyContent = "space-between";
  bar.style.alignItems = "center";
  bar.style.padding = "0.8rem 1rem";
  bar.style.fontFamily = "Arial,sans-serif";
  bar.style.zIndex = "9999";
  bar.style.boxShadow = "0 -2px 8px rgba(0,0,0,0.2)";
  bar.style.flexWrap = "wrap";

  // Info
  const info = document.createElement("div");
  info.innerHTML = `<strong>${title}</strong> - $${price}`;

  // Quantity
  const quantityInput = document.createElement("input");
  quantityInput.type = "number";
  quantityInput.value = 1;
  quantityInput.min = 1;
  quantityInput.style.width = "50px";
  quantityInput.style.marginRight = "1rem";
  quantityInput.style.borderRadius = "4px";
  quantityInput.style.border = "none";
  quantityInput.style.padding = "0.3rem";

  // Add to Cart button
  const button = document.createElement("button");
  button.textContent = "Add to Cart 🛒";
  button.style.backgroundColor = "#e76f51";
  button.style.border = "none";
  button.style.color = "#fff";
  button.style.padding = "0.5rem 1rem";
  button.style.borderRadius = "5px";
  button.style.cursor = "pointer";

  button.addEventListener("click", async (e) => {
    e.stopPropagation();
    const qty = parseInt(quantityInput.value) || 1;
    try {
      await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ id: productId, quantity: qty }] }),
      });
      button.textContent = "Added!";
      setTimeout(() => (button.textContent = "Add to Cart 🛒"), 1500);
    } catch (err) {
      console.error("Sticky Bar add to cart error:", err);
      button.textContent = "Error";
      setTimeout(() => (button.textContent = "Add to Cart 🛒"), 1500);
    }
  });

  // Redirect to cart if bar clicked
  bar.addEventListener("click", () => (window.location.href = "/cart"));

  const actionContainer = document.createElement("div");
  actionContainer.style.display = "flex";
  actionContainer.style.alignItems = "center";
  actionContainer.appendChild(quantityInput);
  actionContainer.appendChild(button);

  bar.appendChild(info);
  bar.appendChild(actionContainer);
  document.body.appendChild(bar);

  // Responsive
  const resizeObserver = () => {
    if (window.innerWidth < 480) {
      bar.style.flexDirection = "column";
      bar.style.alignItems = "flex-start";
      actionContainer.style.marginTop = "0.5rem";
    } else {
      bar.style.flexDirection = "row";
      bar.style.alignItems = "center";
      actionContainer.style.marginTop = "0";
    }
  };
  window.addEventListener("resize", resizeObserver);
  resizeObserver();
})();
