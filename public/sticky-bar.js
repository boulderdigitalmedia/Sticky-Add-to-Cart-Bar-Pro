(function() {
  // Check if bar already exists
  if (document.getElementById("sticky-add-to-cart-bar")) return;

  // Create sticky bar element
  const bar = document.createElement("div");
  bar.id = "sticky-add-to-cart-bar";
  bar.style.position = "fixed";
  bar.style.bottom = "0";
  bar.style.left = "0";
  bar.style.width = "100%";
  bar.style.backgroundColor = "#2a9d8f";
  bar.style.color = "#fff";
  bar.style.textAlign = "center";
  bar.style.padding = "1rem";
  bar.style.fontSize = "1.2rem";
  bar.style.zIndex = "9999";
  bar.style.boxShadow = "0 -2px 8px rgba(0,0,0,0.2)";
  bar.textContent = "🛒 Sticky Add-to-Cart Bar is active!";

  // Optional: Click redirects to cart
  bar.addEventListener("click", () => {
    const cartLink = "/cart";
    window.location.href = cartLink;
  });

  // Append to body
  document.body.appendChild(bar);
})();
