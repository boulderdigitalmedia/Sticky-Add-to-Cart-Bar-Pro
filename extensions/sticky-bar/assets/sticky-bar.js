document.addEventListener("DOMContentLoaded", () => {
  const stickyBtn = document.getElementById("sticky-add-to-cart-btn");
  if (stickyBtn) {
    stickyBtn.addEventListener("click", () => {
      const addToCartForm = document.querySelector('form[action*="/cart/add"]');
      if (addToCartForm) addToCartForm.submit();
    });
  }
});
