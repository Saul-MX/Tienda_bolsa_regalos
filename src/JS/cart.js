// ============================================================
// CART STORE — Persistencia con localStorage
// Se sincroniza entre pestañas usando el evento "storage"
// ============================================================

const CART_KEY = "astro_cart";

// ── Helpers ──────────────────────────────────────────────────

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  // Disparar evento personalizado para actualizar la UI en la misma pestaña
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: cart }));
}

// ── Acciones ─────────────────────────────────────────────────

export function addToCart(product) {
  // product = { id, name, price, image? }
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  saveCart(cart);
}

export function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
}

export function updateQty(productId, qty) {
  if (qty < 1) return removeFromCart(productId);
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (item) {
    item.qty = qty;
    saveCart(cart);
  }
}

export function clearCart() {
  saveCart([]);
}

export function getTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function getCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

// ── UI Renderer ───────────────────────────────────────────────

function renderCart(cart) {
  const list = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  const countEls = document.querySelectorAll("[data-cart-count]");
  const emptyMsg = document.getElementById("cart-empty");

  // Actualizar contador en el ícono
  const count = cart.reduce((s, i) => s + i.qty, 0);
  countEls.forEach((el) => {
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });

  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = "";
    if (emptyMsg) emptyMsg.style.display = "block";
    if (totalEl) totalEl.textContent = "$0.00";
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";

  list.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item" data-id="${item.id}">
      ${item.image ? `<img src="${item.image}" alt="${item.name}" class="cart-item-img" />` : ""}
      <div class="cart-item-info">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</p>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" data-action="dec" data-id="${item.id}">−</button>
        <span class="qty-value">${item.qty}</span>
        <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
        <button class="remove-btn" data-id="${item.id}">✕</button>
      </div>
    </div>
  `
    )
    .join("");

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

// ── Event Delegation para items del carrito ───────────────────

function bindCartEvents() {
  const list = document.getElementById("cart-items");
  if (!list) return;

  list.addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    const action = e.target.dataset.action;

    if (!id) return;

    if (e.target.classList.contains("remove-btn")) {
      removeFromCart(id);
    } else if (action === "inc") {
      const cart = getCart();
      const item = cart.find((i) => i.id === id);
      if (item) updateQty(id, item.qty + 1);
    } else if (action === "dec") {
      const cart = getCart();
      const item = cart.find((i) => i.id === id);
      if (item) updateQty(id, item.qty - 1);
    }
  });

  // Botón limpiar carrito
  const clearBtn = document.getElementById("cart-clear");
  if (clearBtn) clearBtn.addEventListener("click", clearCart);
}

// ── Drawer toggle ─────────────────────────────────────────────

function bindDrawerToggle() {
  const openBtn = document.getElementById("cart-open");
  const closeBtn = document.getElementById("cart-close");
  const overlay = document.getElementById("cart-overlay");
  const drawer = document.getElementById("cart-drawer");

  const open = () => {
    drawer?.classList.add("open");
    overlay?.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    drawer?.classList.remove("open");
    overlay?.classList.remove("open");
    document.body.style.overflow = "";
  };

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);
}

// ── "Agregar al carrito" desde ProductCards ───────────────────

function bindAddButtons() {
  document.addEventListener("click", (e) => {
    if (!e.target.matches("[data-add-to-cart]")) return;

    const btn = e.target;
    const product = {
      id: btn.dataset.id,
      name: btn.dataset.name,
      price: parseFloat(btn.dataset.price),
      image: btn.dataset.image || "",
    };

    addToCart(product);

    // Feedback visual temporal
    btn.textContent = "¡Agregado!";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = btn.dataset.label || "Agregar al carrito";
      btn.disabled = false;
    }, 1200);
  });
}

// ── Init ──────────────────────────────────────────────────────

export function initCart() {
  // Render inicial
  renderCart(getCart());

  // Actualizar UI cuando cambia el carrito (misma pestaña)
  window.addEventListener("cart:updated", (e) => renderCart(e.detail));

  // Sincronizar entre pestañas (otro origen)
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY) {
      renderCart(getCart());
    }
  });

  bindCartEvents();
  bindDrawerToggle();
  bindAddButtons();
}
