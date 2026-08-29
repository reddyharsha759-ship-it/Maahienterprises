(function () {
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", function () {
    var open = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  menu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
})();

(function () {
  var STORAGE_KEY = "glc_cart_v1";
  var ORDERS_KEY = "glc_orders_v1";
  var CATALOG_KEY = "glc_catalog_v1";

  var DEFAULT_CATALOG = {
    "5kg": {
      title: "5 kg cocopeat blocks",
      price: 220,
      unitLabel: "block",
      thumb: "product-card-media--5kg",
      tag: "Professional grade",
      desc: "The ultimate eco-friendly solution for professional-grade plant growth, compost mixes, hydroponics, or soilless gardening.",
      features: [
        "Expand up to 60–75 L of nutrient-ready medium",
        "Roughly 10–12 medium pots",
        "About 0.6–0.75 m² garden bed (6.5–8 sq ft) at 10 cm depth",
        "Dimensions: 2 × 12 × 4.7″"
      ]
    },
    "650g": {
      title: "650 g cocopeat blocks",
      price: 48,
      unitLabel: "block",
      thumb: "product-card-media--650g",
      tag: "Compact & versatile",
      desc: "Eco-friendly and ideal for small spaces — seedlings, herbs, or microgreens.",
      features: [
        "Expand up to 8–10 L",
        "1–2 medium pots",
        "Small bed ~0.08–0.1 m² at 10 cm depth",
        "Dimensions: 8 × 4 × 2″"
      ]
    },
    growbags: {
      title: "Grow bags",
      price: 175,
      unitLabel: "bag",
      thumb: "product-card-media--growbags",
      tag: "Ready to use",
      desc: "Optimal water retention and aeration for robust roots. UV-protected, pH-balanced, sterile, and resistant to pests and diseases.",
      features: [
        "Ideal for: tomatoes, cucumbers, peppers, strawberries, flowers, herbs, and vegetables — less labor, strong growth."
      ]
    },
    husk: {
      title: "Coir husk chip block",
      price: 310,
      unitLabel: "block",
      thumb: "product-card-media--husk",
      tag: "Drainage & aeration",
      desc: "Ideal for orchids, succulents, cactus, and any crop that prefers drier roots. Superior air circulation and reduced waterlogging.",
      features: [
        "Dimensions: 12″ × 12″ × 5″"
      ]
    }
  };

  function getCatalog() {
    try {
      var raw = localStorage.getItem(CATALOG_KEY);
      if (!raw) {
        localStorage.setItem(CATALOG_KEY, JSON.stringify(DEFAULT_CATALOG));
        return JSON.parse(JSON.stringify(DEFAULT_CATALOG));
      }
      return JSON.parse(raw);
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_CATALOG));
    }
  }

  var CATALOG = getCatalog();

  function formatRupee(n) {
    return "₹" + Math.round(n).toLocaleString("en-IN");
  }

  function getCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(data)) return [];
      return data.filter(function (l) {
        return l && l.id && CATALOG[l.id] && (l.quantity > 0 || l.qty > 0);
      }).map(function (l) {
        var p = CATALOG[l.id];
        return {
          id: l.id,
          name: l.name || (p ? p.title : l.title || ""),
          price: l.price != null ? l.price : (p ? p.price : 0),
          quantity: l.quantity != null ? l.quantity : (l.qty != null ? l.qty : 1),
          // Aliases for compatibility
          title: l.name || (p ? p.title : l.title || ""),
          qty: l.quantity != null ? l.quantity : (l.qty != null ? l.qty : 1)
        };
      });
    } catch (e) {
      return [];
    }
  }

  function setCart(lines) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }

  function cartSubtotal(lines) {
    return lines.reduce(function (sum, l) {
      var price = l.price != null ? l.price : (CATALOG[l.id] ? CATALOG[l.id].price : 0);
      var qty = l.quantity != null ? l.quantity : (l.qty != null ? l.qty : 1);
      return sum + (price * qty);
    }, 0);
  }

  function addLine(id, qty) {
    var p = CATALOG[id];
    if (!p) return;
    var n = Math.max(1, parseInt(qty, 10) || 1);
    var cart = getCart();
    var found = null;
    cart.forEach(function (l) {
      if (l.id === id) found = l;
    });
    if (found) {
      found.quantity = (found.quantity || found.qty || 0) + n;
      found.qty = found.quantity;
    } else {
      cart.push({
        id: id,
        name: p.title,
        price: p.price,
        quantity: n,
        title: p.title,
        qty: n
      });
    }
    setCart(cart);
    refreshAll();
  }

  function setLineQty(id, qty) {
    var n = parseInt(qty, 10);
    if (isNaN(n) || n < 1) n = 1;
    var cart = getCart().map(function (l) {
      if (l.id !== id) return l;
      var p = CATALOG[l.id];
      return {
        id: id,
        name: l.name || (p ? p.title : ""),
        price: l.price != null ? l.price : (p ? p.price : 0),
        quantity: n,
        title: l.name || (p ? p.title : ""),
        qty: n
      };
    });
    setCart(cart);
    refreshAll();
  }

  function removeLine(id) {
    setCart(getCart().filter(function (l) {
      return l.id !== id;
    }));
    refreshAll();
  }

  var backdrop = document.getElementById("cart-backdrop");
  var drawer = document.getElementById("cart-drawer");
  var drawerBody = document.getElementById("cart-drawer-body");
  var drawerSubtotal = document.getElementById("cart-drawer-subtotal");
  var cartOpenBtn = document.getElementById("cart-open-btn");
  var cartCloseBtn = document.getElementById("cart-close-btn");
  var cartCheckoutBtn = document.getElementById("cart-checkout-btn");
  var cartContinue = document.getElementById("cart-continue-shop");
  var badge = document.getElementById("cart-badge");
  var heroCart = document.getElementById("hero-cart-btn");
  var productGrid = document.getElementById("product-grid");
  var searchInput = document.getElementById("product-search");

  var checkoutEmpty = document.getElementById("checkout-empty");
  var checkoutSummary = document.getElementById("checkout-summary");
  var checkoutLines = document.getElementById("checkout-summary-lines");
  var checkoutSubtotalEl = document.getElementById("checkout-subtotal");
  var cartSnapshot = document.getElementById("order-cart-snapshot");
  var orderForm = document.getElementById("order-form");
  var placeOrderBtn = document.getElementById("place-order-btn");

  function openCart() {
    if (!drawer || !backdrop) return;
    document.body.classList.add("cart-open");
    backdrop.classList.add("is-visible");
    backdrop.setAttribute("aria-hidden", "false");
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    if (cartOpenBtn) cartOpenBtn.setAttribute("aria-expanded", "true");
    renderDrawer();
  }

  function closeCart() {
    if (!drawer || !backdrop) return;
    document.body.classList.remove("cart-open");
    backdrop.classList.remove("is-visible");
    backdrop.setAttribute("aria-hidden", "true");
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    if (cartOpenBtn) cartOpenBtn.setAttribute("aria-expanded", "false");
  }

  function syncBadge() {
    var cart = getCart();
    var count = cart.reduce(function (s, l) {
      return s + l.qty;
    }, 0);
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  function renderDrawer() {
    if (!drawerBody || !drawerSubtotal) return;
    var cart = getCart();
    var sub = cartSubtotal(cart);
    drawerSubtotal.textContent = formatRupee(sub);

    if (!cart.length) {
      drawerBody.innerHTML =
        '<p class="cart-drawer-empty">Your cart is empty. Add items from the product list.</p>';
      return;
    }

    drawerBody.innerHTML = "";
    cart.forEach(function (line) {
      var p = CATALOG[line.id];
      if (!p) return;
      var row = document.createElement("div");
      row.className = "cart-line";
      row.setAttribute("data-cart-line", line.id);
      var lineTotal = p.price * line.qty;
      row.innerHTML =
        '<div class="cart-line-thumb ' +
        p.thumb +
        '" aria-hidden="true"></div>' +
        '<div class="cart-line-info">' +
        '<p class="cart-line-title"></p>' +
        '<p class="cart-line-meta"></p>' +
        '<div class="cart-line-actions">' +
        '<label class="sr-only" for="cart-qty-' +
        line.id +
        '">Quantity</label>' +
        '<input type="number" min="1" max="99999" id="cart-qty-' +
        line.id +
        '" value="' +
        line.qty +
        '">' +
        '<button type="button" class="cart-line-remove" data-remove="' +
        line.id +
        '">Delete</button>' +
        "</div></div>";
      row.querySelector(".cart-line-title").textContent = p.title;
      row.querySelector(".cart-line-meta").textContent =
        formatRupee(p.price) +
        " × " +
        line.qty +
        " · " +
        formatRupee(lineTotal);

      var qtyInp = row.querySelector('input[type="number"]');
      qtyInp.addEventListener("change", function () {
        setLineQty(line.id, qtyInp.value);
      });

      row.querySelector("[data-remove]").addEventListener("click", function () {
        removeLine(line.id);
      });

      drawerBody.appendChild(row);
    });
  }

  function renderCheckout() {
    var cart = getCart();
    var sub = cartSubtotal(cart);
    var user = getConsumer();

    if (checkoutEmpty) {
      if (cart.length) checkoutEmpty.setAttribute("hidden", "");
      else checkoutEmpty.removeAttribute("hidden");
    }

    if (checkoutSummary) {
      if (cart.length) checkoutSummary.removeAttribute("hidden");
      else checkoutSummary.setAttribute("hidden", "");
    }

    if (orderForm) {
      orderForm.classList.toggle("checkout-form-hidden", !cart.length || !user);
    }

    if (placeOrderBtn) {
      placeOrderBtn.disabled = !cart.length || !user;
    }

    if (checkoutLines && checkoutSubtotalEl) {
      checkoutLines.innerHTML = "";
      cart.forEach(function (line) {
        var p = CATALOG[line.id];
        if (!p) return;
        var li = document.createElement("li");
        var lt = p.price * line.qty;
        li.innerHTML =
          "<span><strong>" +
          escapeHtml(p.title) +
          "</strong> × " +
          line.qty +
          "</span><span>" +
          formatRupee(lt) +
          "</span>";
        checkoutLines.appendChild(li);
      });
      checkoutSubtotalEl.textContent = formatRupee(sub);
    }

    if (cartSnapshot) {
      cartSnapshot.value = JSON.stringify({
        lines: cart,
        subtotal: sub,
        currency: "INR",
      });
    }
    renderCheckoutAuth();
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // --- CUSTOMER PROFILE SYSTEM ---
  var profileDrawer = document.getElementById("profile-drawer");
  var profileOpenBtn = document.getElementById("profile-open-btn");
  var profileCloseBtn = document.getElementById("profile-close-btn");
  var profileBody = document.getElementById("profile-drawer-body");
  var CONSUMER_KEY = "maahi_consumer_profile";

  var profileViewState = "main"; // "main", "track-order", "addresses", "add-address"
  var selectedTrackingOrderId = null;

  function openProfile() {
    var user = getConsumer();
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    if (!profileDrawer || !backdrop) return;
    if (drawer) {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
    }
    
    document.body.classList.add("cart-open");
    backdrop.classList.add("is-visible");
    backdrop.setAttribute("aria-hidden", "false");
    profileDrawer.classList.add("is-open");
    profileDrawer.setAttribute("aria-hidden", "false");
    if (profileOpenBtn) profileOpenBtn.setAttribute("aria-expanded", "true");
    profileViewState = "main";
    selectedTrackingOrderId = null;
    renderProfile();

    if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
      window.maahiSupabase.fetchOrders().then(function (dbOrders) {
        if (dbOrders) {
          localStorage.setItem(ORDERS_KEY, JSON.stringify(dbOrders));
          renderProfile();
        }
      }).catch(function (err) {
        console.warn("Failed to fetch orders on profile open:", err);
      });
    }
  }

  function closeProfile() {
    if (!profileDrawer || !backdrop) return;
    document.body.classList.remove("cart-open");
    backdrop.classList.remove("is-visible");
    backdrop.setAttribute("aria-hidden", "true");
    profileDrawer.classList.remove("is-open");
    profileDrawer.setAttribute("aria-hidden", "true");
    if (profileOpenBtn) profileOpenBtn.setAttribute("aria-expanded", "false");
  }

  function closeAllDrawers() {
    closeCart();
    closeProfile();
  }

  function getConsumer() {
    try {
      var raw = localStorage.getItem(CONSUMER_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && !parsed.addresses) {
        parsed.addresses = [];
      }
      return parsed;
    } catch(e) {
      return null;
    }
  }

  function setConsumer(profile) {
    if (profile) {
      localStorage.setItem(CONSUMER_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(CONSUMER_KEY);
    }
    syncConsumerState();
  }

  function syncConsumerState() {
    var user = getConsumer();
    var label = document.getElementById("profile-btn-label");
    if (label) {
      label.textContent = user ? (user.name.split(" ")[0]) : "Sign In";
    }
    
    var nameField = document.getElementById("order-name");
    var emailField = document.getElementById("order-email");
    var regionField = document.getElementById("order-region");
    var addressField = document.getElementById("order-address");

    if (user) {
      if (nameField && !nameField.value) nameField.value = user.name;
      if (emailField && !emailField.value) emailField.value = user.email;

      // Auto-fill address if user has saved addresses and checkout inputs are empty
      if (user.addresses && user.addresses.length > 0) {
        var addr = user.addresses[0];
        if (regionField && !regionField.value) regionField.value = addr.region || "";
        if (addressField && !addressField.value) addressField.value = addr.street || "";
      }
    } else {
      if (nameField) nameField.value = "";
      if (emailField) emailField.value = "";
      if (regionField) regionField.value = "";
      if (addressField) addressField.value = "";
    }
    renderCheckout();
  }

  // --- AUTH SYSTEM ---
  function logoutConsumer() {
    setConsumer(null);
    if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
      window.maahiSupabase.signOut().catch(function (err) {
        console.warn("Supabase signOut failed:", err);
      });
    }
    
    var nameField = document.getElementById("order-name");
    var emailField = document.getElementById("order-email");
    var regionField = document.getElementById("order-region");
    var addressField = document.getElementById("order-address");
    if (nameField) nameField.value = "";
    if (emailField) emailField.value = "";
    if (regionField) regionField.value = "";
    if (addressField) addressField.value = "";

    closeAllDrawers();
    refreshAll();
  }

  function renderCheckoutAuth() {
    var authSection = document.getElementById("checkout-auth-section");
    if (!authSection) return;
    
    var user = getConsumer();
    var cart = getCart();
    
    if (!cart.length) {
      authSection.classList.add("checkout-auth-hidden");
      return;
    }
    authSection.classList.remove("checkout-auth-hidden");
    
    if (user) {
      var html = '<div class="checkout-signed-in-info" style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; background:#f0f7f3; border:1px solid rgba(45,106,79,0.2); border-radius:10px; padding:0.85rem 1rem;">';
      html += '  <div style="display:flex; align-items:center; gap:0.65rem;">';
      html += '    <div style="width:34px; height:34px; border-radius:50%; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.9rem;">✓</div>';
      html += '    <div>';
      html += '      <p class="checkout-signed-in-text" style="margin:0; font-size:0.92rem; color:var(--text);">Signed in as <strong>' + escapeHtml(user.name) + '</strong></p>';
      html += '      <span style="font-size:0.8rem; color:var(--text-muted);">' + escapeHtml(user.email) + '</span>';
      html += '    </div>';
      html += '  </div>';
      html += '  <button type="button" class="btn-signout-link" id="checkout-signout-btn" style="background:none; border:none; color:var(--accent); font-weight:600; text-decoration:underline; cursor:pointer; font-size:0.85rem;">Switch Account / Sign Out</button>';
      html += '</div>';
      authSection.innerHTML = html;
      
      var signoutBtn = authSection.querySelector("#checkout-signout-btn");
      if (signoutBtn) {
        signoutBtn.addEventListener("click", logoutConsumer);
      }
    } else {
      var html = '<div style="background: rgba(45, 106, 79, 0.06); border: 1.5px dashed rgba(45, 106, 79, 0.3); border-radius: 12px; padding: 1.5rem 1.25rem; text-align: center;">';
      html += '  <div style="width: 44px; height: 44px; margin: 0 auto 0.65rem; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.15rem;">🔒</div>';
      html += '  <h3 style="margin: 0 0 0.35rem; color: var(--accent); font-family: var(--font-display); font-size: 1.15rem; font-weight: 700;">Customer Sign-In Required</h3>';
      html += '  <p style="margin: 0 0 1.15rem; font-size: 0.9rem; color: var(--text-muted); line-height: 1.45; max-width: 440px; margin-left: auto; margin-right: auto;">Please sign in to your account first. After signing in, you will be able to enter delivery details and proceed to payment.</p>';
      html += '  <a href="login.html?redirect=#order" class="btn btn-submit" style="display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 8px; font-weight: 700; width: 100%; max-width: 280px; box-sizing: border-box; box-shadow: 0 4px 12px rgba(45,106,79,0.25);">Sign In / Register to Pay</a>';
      html += '</div>';
      authSection.innerHTML = html;
    }
  }

  function renderProfile() {
    if (!profileBody) return;
    var user = getConsumer();
    
    if (!user) {
      var html = '<form id="customer-login-form" novalidate style="display:flex; flex-direction:column; gap:1.25rem; padding: 0.5rem 0;">';
      html += '  <p style="font-size:0.9rem; color:var(--text-muted); margin: 0 0 0.5rem 0;">Sign in to save checkout information and track orders.</p>';
      html += '  <div class="field" style="display:flex; flex-direction:column; gap:0.35rem;">';
      html += '    <label for="cust-email" style="font-size: 0.8rem; font-weight:700; text-transform:uppercase; color:var(--accent);">Email Address</label>';
      html += '    <input type="email" id="cust-email" name="email" required placeholder="you@example.com" style="width:100%; padding:0.65rem 0.85rem; border:1px solid rgba(45, 106, 79, 0.22); border-radius:10px; background:#fcfbf9; font:inherit;">';
      html += '  </div>';
      html += '  <div class="field" style="display:flex; flex-direction:column; gap:0.35rem;">';
      html += '    <label for="cust-password" style="font-size: 0.8rem; font-weight:700; text-transform:uppercase; color:var(--accent);">Password</label>';
      html += '    <input type="password" id="cust-password" name="password" required placeholder="••••••••" style="width:100%; padding:0.65rem 0.85rem; border:1px solid rgba(45, 106, 79, 0.22); border-radius:10px; background:#fcfbf9; font:inherit;">';
      html += '  </div>';
      html += '  <button type="submit" class="btn btn-submit" style="background: var(--accent); color:#fff; border-color:var(--accent); font-weight:700; width:100%; margin-top:0.5rem; padding:0.75rem; border-radius:8px;">Sign In</button>';
      html += '  <p class="form-error" id="cust-login-error" role="alert" hidden style="color:#b91c1c; font-size:0.85rem; font-weight:600; margin:0;"></p>';
      html += '</form>';
      
      profileBody.innerHTML = html;
      
      var loginForm = profileBody.querySelector("#customer-login-form");
      var errorEl = profileBody.querySelector("#cust-login-error");
      
      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (errorEl) errorEl.hidden = true;
        
        var email = loginForm.elements["email"].value.trim();
        var password = loginForm.elements["password"].value;
        
        if (!email || !password) {
          if (errorEl) {
            errorEl.textContent = "Please fill in all fields.";
            errorEl.hidden = false;
          }
          return;
        }
        
        var users = [];
        try {
          var raw = localStorage.getItem("maahi_local_users");
          if (raw) users = JSON.parse(raw);
        } catch(e) {}
        if (!Array.isArray(users)) users = [];
        
        var customerProfile = null;
        for (var i = 0; i < users.length; i++) {
          if (users[i].email === email && users[i].password === password) {
            customerProfile = { name: users[i].name, email: users[i].email, addresses: users[i].addresses || [] };
            break;
          }
        }

        if (customerProfile) {
          setConsumer(customerProfile);
          renderProfile();
        } else {
          if (errorEl) {
            errorEl.textContent = "Incorrect email or password.";
            errorEl.hidden = false;
          }
        }
      });
    } else {
      if (profileViewState === "main") {
        var html = '<div style="display:flex; flex-direction:column; gap:1.25rem; padding: 0.5rem 0;">';
        html += '  <div style="display:flex; align-items:center; gap:0.75rem; padding-bottom:1rem; border-bottom:1px solid rgba(0,0,0,0.06);">';
        html += '    <div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, var(--accent), var(--gold)); color:#fff; display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-size:1.35rem; font-weight:700;">C</div>';
        html += '    <div>';
        html += '      <strong style="display:block; color:var(--text); font-size:1.05rem;">' + escapeHtml(user.name) + '</strong>';
        html += '      <span style="font-size:0.8rem; color:var(--text-muted);">' + escapeHtml(user.email) + '</span>';
        html += '    </div>';
        html += '  </div>';
        
        // Address Book Summary
        var addressCount = user.addresses ? user.addresses.length : 0;
        var addressSummary = addressCount === 0 ? "No saved addresses yet." : addressCount + " address(es) saved";
        html += '  <div style="background:#fcfbf9; border:1px solid rgba(45, 106, 79, 0.12); padding:0.85rem; border-radius:10px;">';
        html += '    <div style="display:flex; justify-content:space-between; align-items:center;">';
        html += '      <strong style="font-size:0.85rem; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:0.04em;">Address Book</strong>';
        html += '      <button type="button" id="btn-go-addresses" style="font-size:0.8rem; background:none; border:none; color:var(--accent); text-decoration:underline; font-weight:700; cursor:pointer; padding:0;">Manage</button>';
        html += '    </div>';
        html += '    <p style="margin:0.25rem 0 0 0; font-size:0.82rem; color:var(--text-muted);">' + addressSummary + '</p>';
        html += '  </div>';
        
        // Orders list
        html += '  <div>';
        html += '    <h3 style="font-family:var(--font-display); font-size:1.1rem; color:var(--accent); margin:0 0 0.75rem 0;">Your Orders</h3>';
        html += '    <div id="cust-orders-list" style="display:flex; flex-direction:column; gap:0.75rem; max-height: 250px; overflow-y:auto; padding-right:0.25rem;">';
        
        var customerOrders = [];
        try {
          var rawOrders = localStorage.getItem(ORDERS_KEY);
          var allOrders = rawOrders ? JSON.parse(rawOrders) : [];
          if (Array.isArray(allOrders)) {
            customerOrders = allOrders.filter(function (o) {
              return o && o.customer && o.customer.email === user.email;
            });
          }
        } catch(e) {}
        
        if (customerOrders.length === 0) {
          html += '<p style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:1.25rem 0;">You haven\'t placed any orders yet.</p>';
        } else {
          customerOrders.forEach(function (o) {
            var dt = "";
            if (o.createdAt) {
              dt = new Date(o.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" });
            }
            var statusName = o.status || "new";
            var statusPill = '<span class="status-pill status-' + statusName + '" style="font-size: 0.65rem; padding: 0.15rem 0.45rem;">' + statusName + '</span>';
            
            html += '      <div style="background:#fdfdfc; border:1px solid rgba(45, 106, 79, 0.12); padding:0.75rem; border-radius:8px; display:flex; flex-direction:column; gap:0.5rem;">';
            html += '        <div style="display:flex; justify-content:space-between; align-items:center;">';
            html += '          <div>';
            html += '            <strong style="display:block; font-size:0.85rem; color:var(--text);">' + escapeHtml(o.id) + '</strong>';
            html += '            <span style="font-size:0.75rem; color:var(--text-muted);">' + dt + ' · ' + formatRupee(o.subtotal) + '</span>';
            html += '          </div>';
            html += '          <div>' + statusPill + '</div>';
            html += '        </div>';
            html += '        <div style="border-top: 1px dashed rgba(0,0,0,0.06); padding-top:0.4rem; display:flex; justify-content:flex-end;">';
            html += '          <button type="button" class="btn-track-order" data-order-id="' + o.id + '" style="background:none; border:none; padding:0; color:var(--accent); font-weight:700; text-decoration:underline; font-size:0.8rem; cursor:pointer;">Track Order &rarr;</button>';
            html += '        </div>';
            html += '      </div>';
          });
        }
        
        html += '    </div>';
        html += '  </div>';
        
        html += '  <button type="button" id="btn-cust-logout" class="btn btn-outline" style="border-color:rgba(248, 113, 113, 0.4); color:#b91c1c; font-weight:700; padding:0.65rem; width:100%; border-radius:8px; cursor:pointer;">Sign Out</button>';
        html += '</div>';
        
        profileBody.innerHTML = html;
        
        var goAddressesBtn = profileBody.querySelector("#btn-go-addresses");
        if (goAddressesBtn) {
          goAddressesBtn.addEventListener("click", function () {
            profileViewState = "addresses";
            renderProfile();
          });
        }
        
        profileBody.querySelectorAll(".btn-track-order").forEach(function (btn) {
          btn.addEventListener("click", function () {
            selectedTrackingOrderId = btn.getAttribute("data-order-id");
            profileViewState = "track-order";
            renderProfile();
          });
        });
        
        profileBody.querySelector("#btn-cust-logout").addEventListener("click", logoutConsumer);
        
      } else if (profileViewState === "addresses") {
        var html = '<div style="display:flex; flex-direction:column; gap:1.25rem; padding: 0.5rem 0;">';
        html += '  <div style="display:flex; align-items:center; justify-content:space-between; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.06);">';
        html += '    <h3 style="font-family:var(--font-display); font-size:1.15rem; color:var(--accent); margin:0;">Saved Addresses</h3>';
        html += '    <button type="button" id="btn-back-to-profile" style="background:none; border:none; padding:0; color:var(--text-muted); font-size:0.8rem; font-weight:600; text-decoration:underline; cursor:pointer;">&larr; Back</button>';
        html += '  </div>';
        
        html += '  <div style="display:flex; flex-direction:column; gap:0.75rem; max-height: 290px; overflow-y:auto; padding-right:0.25rem;">';
        
        if (!user.addresses || user.addresses.length === 0) {
          html += '    <p style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:1.5rem 0;">No saved addresses. Add an address below.</p>';
        } else {
          user.addresses.forEach(function (addr, index) {
            html += '    <div style="background:#fdfdfc; border:1px solid rgba(45, 106, 79, 0.12); padding:0.75rem; border-radius:8px; display:flex; flex-direction:column; gap:0.4rem;">';
            html += '      <div style="display:flex; justify-content:space-between; align-items:center;">';
            html += '        <strong style="color:var(--accent); font-size:0.85rem; text-transform:uppercase; letter-spacing:0.04em;">' + escapeHtml(addr.label || "Address") + '</strong>';
            html += '        <div style="display:flex; gap:0.5rem;">';
            html += '          <button type="button" class="btn-apply-addr" data-index="' + index + '" style="background:none; border:none; padding:0; color:var(--accent); text-decoration:underline; font-size:0.75rem; font-weight:700; cursor:pointer;">Apply</button>';
            html += '          <span style="color:rgba(0,0,0,0.1)">|</span>';
            html += '          <button type="button" class="btn-delete-addr" data-index="' + index + '" style="background:none; border:none; padding:0; color:#b91c1c; text-decoration:underline; font-size:0.75rem; font-weight:700; cursor:pointer;">Delete</button>';
            html += '        </div>';
            html += '      </div>';
            html += '      <p style="margin:0; font-size:0.82rem; color:var(--text); line-height:1.4;">';
            html += '        ' + escapeHtml(addr.street) + '<br>';
            html += '        ' + escapeHtml(addr.region);
            html += '      </p>';
            html += '    </div>';
          });
        }
        
        html += '  </div>';
        
        html += '  <button type="button" id="btn-go-add-address" class="btn btn-submit" style="background:var(--accent); color:#fff; border-color:var(--accent); font-weight:700; width:100%; padding:0.65rem; border-radius:8px;">Add New Address</button>';
        html += '</div>';
        
        profileBody.innerHTML = html;
        
        profileBody.querySelector("#btn-back-to-profile").addEventListener("click", function () {
          profileViewState = "main";
          renderProfile();
        });
        
        profileBody.querySelector("#btn-go-add-address").addEventListener("click", function () {
          profileViewState = "add-address";
          renderProfile();
        });
        
        profileBody.querySelectorAll(".btn-apply-addr").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var index = parseInt(btn.getAttribute("data-index"), 10);
            var addr = user.addresses[index];
            if (addr) {
              var regionField = document.getElementById("order-region");
              var addressField = document.getElementById("order-address");
              if (regionField) regionField.value = addr.region || "";
              if (addressField) addressField.value = addr.street || "";
              
              closeProfile();
              window.location.hash = "#order";
              var orderSection = document.getElementById("order");
              if (orderSection) {
                orderSection.scrollIntoView({ behavior: "smooth" });
              }
              
              if (typeof hideError === "function") hideError();
            }
          });
        });
        
        profileBody.querySelectorAll(".btn-delete-addr").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var index = parseInt(btn.getAttribute("data-index"), 10);
            user.addresses.splice(index, 1);
            setConsumer(user);
            renderProfile();
          });
        });
        
      } else if (profileViewState === "add-address") {
        var html = '<div style="display:flex; flex-direction:column; gap:1.25rem; padding: 0.5rem 0;">';
        html += '  <div style="display:flex; align-items:center; justify-content:space-between; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.06);">';
        html += '    <h3 style="font-family:var(--font-display); font-size:1.15rem; color:var(--accent); margin:0;">New Address</h3>';
        html += '    <button type="button" id="btn-back-to-addresses" style="background:none; border:none; padding:0; color:var(--text-muted); font-size:0.8rem; font-weight:600; text-decoration:underline; cursor:pointer;">&larr; Cancel</button>';
        html += '  </div>';
        
        html += '  <form id="add-address-form" style="display:flex; flex-direction:column; gap:1rem;">';
        html += '    <div class="field" style="display:flex; flex-direction:column; gap:0.3rem;">';
        html += '      <label for="addr-label" style="font-size: 0.75rem; font-weight:700; text-transform:uppercase; color:var(--accent);">Label (e.g. Home, Work)</label>';
        html += '      <input type="text" id="addr-label" name="label" required placeholder="Home" style="width:100%; padding:0.6rem 0.75rem; border:1px solid rgba(45, 106, 79, 0.22); border-radius:8px; font:inherit;">';
        html += '    </div>';
        html += '    <div class="field" style="display:flex; flex-direction:column; gap:0.3rem;">';
        html += '      <label for="addr-region" style="font-size: 0.75rem; font-weight:700; text-transform:uppercase; color:var(--accent);">City / Region</label>';
        html += '      <input type="text" id="addr-region" name="region" required placeholder="Coimbatore, Tamil Nadu" style="width:100%; padding:0.6rem 0.75rem; border:1px solid rgba(45, 106, 79, 0.22); border-radius:8px; font:inherit;">';
        html += '    </div>';
        html += '    <div class="field" style="display:flex; flex-direction:column; gap:0.3rem;">';
        html += '      <label for="addr-street" style="font-size: 0.75rem; font-weight:700; text-transform:uppercase; color:var(--accent);">Street Address</label>';
        html += '      <textarea id="addr-street" name="street" required rows="2" placeholder="123 Green Valley Road" style="width:100%; padding:0.6rem 0.75rem; border:1px solid rgba(45, 106, 79, 0.22); border-radius:8px; font:inherit; resize:vertical;"></textarea>';
        html += '    </div>';
        html += '    <button type="submit" class="btn btn-submit" style="background:var(--accent); color:#fff; border-color:var(--accent); font-weight:700; width:100%; padding:0.65rem; border-radius:8px;">Save Address</button>';
        html += '    <p class="form-error" id="addr-error" role="alert" hidden style="color:#b91c1c; font-size:0.85rem; font-weight:600; margin:0;"></p>';
        html += '  </form>';
        html += '</div>';
        
        profileBody.innerHTML = html;
        
        profileBody.querySelector("#btn-back-to-addresses").addEventListener("click", function () {
          profileViewState = "addresses";
          renderProfile();
        });
        
        var addrForm = profileBody.querySelector("#add-address-form");
        var addrError = profileBody.querySelector("#addr-error");
        
        addrForm.addEventListener("submit", function (e) {
          e.preventDefault();
          if (addrError) addrError.hidden = true;
          
          var label = addrForm.elements["label"].value.trim();
          var region = addrForm.elements["region"].value.trim();
          var street = addrForm.elements["street"].value.trim();
          
          if (!label || !region || !street) {
            if (addrError) {
              addrError.textContent = "Please fill in all fields.";
              addrError.hidden = false;
            }
            return;
          }
          
          if (!user.addresses) user.addresses = [];
          user.addresses.push({
            label: label,
            region: region,
            street: street
          });
          
          setConsumer(user);
          profileViewState = "addresses";
          renderProfile();
        });
        
      } else if (profileViewState === "track-order") {
        var order = null;
        try {
          var rawOrders = localStorage.getItem(ORDERS_KEY);
          var allOrders = rawOrders ? JSON.parse(rawOrders) : [];
          if (Array.isArray(allOrders)) {
            allOrders.forEach(function (o) {
              if (o && o.id === selectedTrackingOrderId) {
                order = o;
              }
            });
          }
        } catch(e) {}
        
        var html = '<div style="display:flex; flex-direction:column; gap:1.25rem; padding: 0.5rem 0;">';
        html += '  <div style="display:flex; align-items:center; justify-content:space-between; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.06);">';
        html += '    <h3 style="font-family:var(--font-display); font-size:1.15rem; color:var(--accent); margin:0;">Track Order</h3>';
        html += '    <button type="button" id="btn-back-to-orders" style="background:none; border:none; padding:0; color:var(--text-muted); font-size:0.8rem; font-weight:600; text-decoration:underline; cursor:pointer;">&larr; Back</button>';
        html += '  </div>';
        
        if (!order) {
          html += '    <p style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:1.5rem 0;">Order details could not be loaded.</p>';
          html += '</div>';
          profileBody.innerHTML = html;
          profileBody.querySelector("#btn-back-to-orders").addEventListener("click", function () {
            profileViewState = "main";
            renderProfile();
          });
          return;
        }
        
        var statusName = order.status || "new";
        var isPlaced = true;
        var isProcessing = ["confirmed", "processing", "shipped", "delivered"].indexOf(statusName) !== -1;
        var isDispatched = ["shipped", "delivered"].indexOf(statusName) !== -1;
        var isDelivered = statusName === "delivered";
        var isCancelled = statusName === "cancelled";
        
        html += '  <div style="font-size:0.82rem; color:var(--text-muted); background:#fcfbf9; padding:0.75rem; border-radius:8px; border:1px solid rgba(45, 106, 79, 0.12); display:flex; flex-direction:column; gap:0.25rem;">';
        html += '    <div><strong>ID:</strong> <code style="font-size:0.85rem; color:var(--accent); font-weight:600;">' + escapeHtml(order.id) + '</code></div>';
        html += '    <div><strong>Date:</strong> ' + new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }) + '</div>';
        html += '    <div><strong>Delivery Date:</strong> ' + escapeHtml(order.customer.target_date || "—") + '</div>';
        html += '    <div><strong>Fulfillment:</strong> ' + escapeHtml(order.customer.fulfillment === "ship" ? "Deliver to location" : "Self-pickup/quote") + '</div>';
        html += '  </div>';
        
        if (isCancelled) {
          html += '  <div style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:0.75rem; border-radius:8px; font-size:0.82rem; font-weight:600; text-align:center;">';
          html += '    This order has been cancelled.';
          html += '  </div>';
        }
        
        html += '  <div style="position:relative; padding-left:1.5rem; display:flex; flex-direction:column; gap:1.5rem;">';
        html += '    <div style="position:absolute; left:6px; top:0.5rem; bottom:0.5rem; width:2px; background:#e2e8f0; z-index:1;"></div>';
        
        // Milestone 1: Placed
        var step1Color = isCancelled ? '#991b1b' : 'var(--accent)';
        var step1Bg = isCancelled ? '#fef2f2' : 'var(--accent)';
        var step1Border = isCancelled ? '#fecaca' : 'var(--accent)';
        html += '    <div style="display:flex; align-items:flex-start; gap:0.75rem; position:relative; z-index:2;">';
        html += '      <div style="width:14px; height:14px; border-radius:50%; background:' + step1Bg + '; border:2px solid ' + step1Border + '; margin-top:0.2rem; flex-shrink:0;"></div>';
        html += '      <div>';
        html += '        <strong style="display:block; font-size:0.85rem; color:' + (isCancelled ? '#991b1b' : (statusName === 'new' ? 'var(--gold)' : 'var(--text)')) + ';">' + (isCancelled ? 'Order Cancelled' : 'Order Placed') + '</strong>';
        html += '        <span style="font-size:0.75rem; color:var(--text-muted);">' + (isCancelled ? 'Your order request was cancelled.' : 'Your order request has been received.') + '</span>';
        html += '      </div>';
        html += '    </div>';
        
        // Milestone 2: Processing
        var step2Color = isProcessing ? 'var(--text)' : 'var(--text-muted)';
        var step2Bg = isProcessing ? 'var(--accent)' : '#fff';
        var step2Border = isProcessing ? 'var(--accent)' : '#cbd5e1';
        var isStep2Current = ["confirmed", "processing"].indexOf(statusName) !== -1;
        html += '    <div style="display:flex; align-items:flex-start; gap:0.75rem; position:relative; z-index:2; opacity:' + (isCancelled ? '0.4' : '1') + ';">';
        html += '      <div style="width:14px; height:14px; border-radius:50%; background:' + step2Bg + '; border:2px solid ' + step2Border + '; margin-top:0.2rem; flex-shrink:0;"></div>';
        html += '      <div>';
        html += '        <strong style="display:block; font-size:0.85rem; color:' + (isStep2Current ? 'var(--gold)' : step2Color) + ';">Processing</strong>';
        html += '        <span style="font-size:0.75rem; color:var(--text-muted);">Your order is under review and being prepared.</span>';
        html += '      </div>';
        html += '    </div>';
        
        // Milestone 3: Dispatched
        var step3Color = isDispatched ? 'var(--text)' : 'var(--text-muted)';
        var step3Bg = isDispatched ? 'var(--accent)' : '#fff';
        var step3Border = isDispatched ? 'var(--accent)' : '#cbd5e1';
        var isStep3Current = statusName === "shipped";
        html += '    <div style="display:flex; align-items:flex-start; gap:0.75rem; position:relative; z-index:2; opacity:' + (isCancelled ? '0.4' : '1') + ';">';
        html += '      <div style="width:14px; height:14px; border-radius:50%; background:' + step3Bg + '; border:2px solid ' + step3Border + '; margin-top:0.2rem; flex-shrink:0;"></div>';
        html += '      <div>';
        html += '        <strong style="display:block; font-size:0.85rem; color:' + (isStep3Current ? 'var(--gold)' : step3Color) + ';">Dispatched</strong>';
        html += '        <span style="font-size:0.75rem; color:var(--text-muted);">In transit or ready for pickup coordination.</span>';
        html += '      </div>';
        html += '    </div>';
        
        // Milestone 4: Delivered
        var step4Color = isDelivered ? 'var(--accent)' : 'var(--text-muted)';
        var step4Bg = isDelivered ? 'var(--accent)' : '#fff';
        var step4Border = isDelivered ? 'var(--accent)' : '#cbd5e1';
        html += '    <div style="display:flex; align-items:flex-start; gap:0.75rem; position:relative; z-index:2; opacity:' + (isCancelled ? '0.4' : '1') + ';">';
        html += '      <div style="width:14px; height:14px; border-radius:50%; background:' + step4Bg + '; border:2px solid ' + step4Border + '; margin-top:0.2rem; flex-shrink:0;"></div>';
        html += '      <div>';
        html += '        <strong style="display:block; font-size:0.85rem; color:' + step4Color + ';">Delivered</strong>';
        html += '        <span style="font-size:0.75rem; color:var(--text-muted);">Order has been safely delivered or picked up.</span>';
        html += '      </div>';
        html += '    </div>';
        
        html += '  </div>';
        
        // Order Summary items
        html += '  <div style="border-top:1px solid rgba(0,0,0,0.06); padding-top:0.75rem;">';
        html += '    <strong style="display:block; font-size:0.85rem; color:var(--accent); margin-bottom:0.4rem; text-transform:uppercase; letter-spacing:0.04em;">Order Items</strong>';
        html += '    <div style="display:flex; flex-direction:column; gap:0.4rem;">';
        order.lines.forEach(function (l) {
          var total = l.lineTotal != null ? l.lineTotal : l.unitPrice * l.qty;
          html += '      <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">';
          html += '        <span><strong>' + escapeHtml(l.title) + '</strong> &times; ' + l.qty + '</span>';
          html += '        <span>' + formatRupee(total) + '</span>';
          html += '      </div>';
        });
        html += '      <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text); font-weight:700; margin-top:0.3rem; border-top:1px dashed rgba(0,0,0,0.06); padding-top:0.3rem;">';
        html += '        <span>Subtotal</span>';
        html += '        <span>' + formatRupee(order.subtotal) + '</span>';
        html += '      </div>';
        html += '    </div>';
        html += '  </div>';
        
        html += '</div>';
        
        profileBody.innerHTML = html;
        
        profileBody.querySelector("#btn-back-to-orders").addEventListener("click", function () {
          profileViewState = "main";
          renderProfile();
        });
      }
    }
  }

  function refreshAll() {
    syncBadge();
    renderDrawer();
    renderCheckout();
  }

  if (productGrid) {
    productGrid.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-add]");
      if (!btn) return;



      var id = btn.getAttribute("data-add");
      var card = btn.closest(".product-card");
      var inp = card ? card.querySelector('[data-qty-for="' + id + '"]') : null;
      var qty = inp ? inp.value : 1;
      addLine(id, qty);
      btn.textContent = "Added ✓";
      setTimeout(function () {
        btn.textContent = "Add to Cart";
      }, 1200);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      var q = searchInput.value.trim().toLowerCase();
      document.querySelectorAll(".product-card[data-product-id]").forEach(function (card) {
        var blob =
          (card.getAttribute("data-search") || "") +
          " " +
          (card.textContent || "").toLowerCase();
        var hide = q.length > 0 && blob.indexOf(q) === -1;
        card.classList.toggle("product-hidden", hide);
      });
    });
  }

  if (cartOpenBtn) cartOpenBtn.addEventListener("click", openCart);
  if (heroCart) heroCart.addEventListener("click", openCart);
  if (cartCloseBtn) cartCloseBtn.addEventListener("click", closeCart);
  if (profileOpenBtn) profileOpenBtn.addEventListener("click", openProfile);
  if (profileCloseBtn) profileCloseBtn.addEventListener("click", closeProfile);
  if (backdrop) backdrop.addEventListener("click", closeAllDrawers);

  if (cartCheckoutBtn) {
    cartCheckoutBtn.addEventListener("click", function () {
      closeCart();
      window.location.hash = "#order";
      document.getElementById("order").scrollIntoView({ behavior: "smooth" });
    });
  }

  if (cartContinue) {
    cartContinue.addEventListener("click", function () {
      closeCart();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("cart-open")) {
      closeAllDrawers();
    }
  });

  var form = document.getElementById("order-form");
  var success = document.getElementById("order-success");
  var errEl = document.getElementById("order-form-error");
  var dateInput = document.getElementById("order-date");
  var resetBtn = document.getElementById("order-reset");
  var orderNumberLine = document.getElementById("order-number-line");

  function hideError() {
    if (errEl) {
      errEl.hidden = true;
      errEl.textContent = "";
    }
  }

  function showError(msg) {
    if (!errEl) return;
    errEl.textContent = msg;
    errEl.hidden = false;
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  var today = new Date();
  var iso =
    today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
  if (dateInput) dateInput.min = iso;



  if (form) {
    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      el.addEventListener("input", hideError);
      el.addEventListener("change", hideError);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError();

      var user = getConsumer();
      if (!user) {
        showError("Please sign in to your customer account to complete your order.");
        window.location.href = "login.html?redirect=#order";
        return;
      }

      var cart = getCart();
      if (!cart.length) {
        showError("Your cart is empty. Add products before placing an order.");
        return;
      }

      var deliveryEl = document.getElementById("order-delivery");
      var nameEl = document.getElementById("order-name");
      var emailEl = document.getElementById("order-email");
      if (!deliveryEl || !deliveryEl.value) {
        showError("Select a fulfillment option.");
        return;
      }
      if (!dateInput || !dateInput.value) {
        showError("Choose a target delivery or dispatch date.");
        if (dateInput) dateInput.focus();
        return;
      }
      if (!nameEl || !nameEl.value.trim()) {
        showError("Enter your full name.");
        if (nameEl) nameEl.focus();
        return;
      }
      if (!emailEl || !emailEl.value.trim()) {
        showError("Enter your email.");
        if (emailEl) emailEl.focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
        showError("Enter a valid email address.");
        emailEl.focus();
        return;
      }

      var chosen = dateInput ? dateInput.value : "";
      if (chosen && chosen < iso) {
        showError("Please choose today or a future date.");
        if (dateInput) dateInput.focus();
        return;
      }


      if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = "Initiating Payment...";
      }

      var orderId = "GLC-" + Date.now().toString(36).toUpperCase();
      var fd = new FormData(form);
      var lines = cart.map(function (line) {
        var p = CATALOG[line.id];
        var title = line.name || (p ? p.title : "");
        var price = line.price != null ? line.price : (p ? p.price : 0);
        var quantity = line.quantity != null ? line.quantity : line.qty;
        return {
          id: line.id,
          name: title,
          price: price,
          quantity: quantity,
          lineTotal: price * quantity
        };
      });
      var subtotal = cartSubtotal(cart);
      var paymentMethod = String(fd.get("payment_method") || "razorpay");

      var orderPayload = {
        id: orderId,
        createdAt: new Date().toISOString(),
        status: "placed",
        lines: lines,
        customer: {
          name: String(fd.get("name") || ""),
          email: String(fd.get("email") || ""),
          phone: String(fd.get("phone") || ""),
          fulfillment: String(fd.get("fulfillment") || ""),
          targetDate: String(fd.get("target_date") || ""),
          region: String(fd.get("region") || ""),
          address: String(fd.get("address") || ""),
          notes: String(fd.get("notes") || ""),
          payment_method: paymentMethod
        },
        subtotal: subtotal
      };

      console.log("Packaged Checkout Order JSON:", orderPayload);

      function saveOrderLocally() {
        try {
          var raw = localStorage.getItem(ORDERS_KEY);
          var list = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(list)) list = [];
          list.unshift({
            id: orderId,
            createdAt: orderPayload.createdAt,
            status: orderPayload.status || "placed",
            subtotal: subtotal,
            lines: lines,
            customer: orderPayload.customer
          });
          if (list.length > 500) list = list.slice(0, 500);
          localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
          
          if (getConsumer()) {
            renderProfile();
          }
        } catch (err) {
          if (typeof console !== "undefined" && console.warn) {
            console.warn("Could not save order locally", err);
          }
        }
      }

      function completeCheckout(paymentInfo) {
        setCart([]);
        refreshAll();

        form.classList.add("checkout-form-hidden");
        if (checkoutSummary) checkoutSummary.setAttribute("hidden", "");
        if (checkoutEmpty) checkoutEmpty.setAttribute("hidden", "");
        if (orderNumberLine) orderNumberLine.textContent = "Order " + orderId;
        
        var paymentDetailsEl = document.getElementById("order-payment-details");
        if (paymentDetailsEl) {
          if (paymentInfo && paymentInfo.razorpay_payment_id) {
            paymentDetailsEl.innerHTML = 
              '<strong>Payment Status:</strong> <span style="color:#067d17; font-weight:700;">✓ Paid via Razorpay</span><br>' +
              '<span style="font-size:0.82rem; color:#2d6a4f; margin-top:4px; display:inline-block;">Razorpay Ref: <code style="background:#fff; padding:2px 6px; border-radius:4px; border:1px solid #a5d6a7; font-weight:600;">' + escapeHtml(paymentInfo.razorpay_payment_id) + '</code></span>';
            paymentDetailsEl.hidden = false;
          } else {
            paymentDetailsEl.innerHTML = 
              '<strong>Payment Status:</strong> <span style="color:#c57a00; font-weight:700;">Pending (Pay on Delivery / Proforma Invoice)</span><br>' +
              '<span style="font-size:0.82rem; color:#555; margin-top:2px; display:inline-block;">Our sales team will contact you to verify details and finalize invoice.</span>';
            paymentDetailsEl.hidden = false;
          }
        }

        if (success) {
          success.hidden = false;
          success.focus();
        }
      }

      // If Razorpay is selected and Razorpay SDK is present
      if (paymentMethod === "razorpay" && typeof Razorpay !== "undefined") {
        if (placeOrderBtn) {
          placeOrderBtn.disabled = true;
          placeOrderBtn.textContent = "Initiating Payment...";
        }

        var configKey = window.MAAHI_CONFIG && window.MAAHI_CONFIG.razorpayKeyId;
        var rzpKey = configKey || localStorage.getItem("maahi_razorpay_key") || "rzp_test_SyiE1HAylAQAEM";
        var options = {
          "key": rzpKey,
          "amount": Math.round(subtotal * 100),
          "currency": "INR",
          "name": "MAAHI PRODUCTS",
          "description": "Order " + orderId + " (" + lines.length + " item" + (lines.length > 1 ? "s" : "") + ")",
          "theme": { "color": "#2d6a4f" },
          "prefill": {
            "name": orderPayload.customer.name,
            "email": orderPayload.customer.email,
            "contact": orderPayload.customer.phone
          },
          "handler": function (response) {
            orderPayload.customer.razorpay_payment_id = response.razorpay_payment_id;
            if (response.razorpay_order_id) orderPayload.customer.razorpay_order_id = response.razorpay_order_id;
            if (response.razorpay_signature) orderPayload.customer.razorpay_signature = response.razorpay_signature;
            orderPayload.status = "paid";

            if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
              if (placeOrderBtn) {
                placeOrderBtn.disabled = true;
                placeOrderBtn.textContent = "Recording Payment...";
              }
              window.maahiSupabase.saveOrder(orderPayload).then(function () {
                saveOrderLocally();
                if (placeOrderBtn) {
                  placeOrderBtn.disabled = false;
                  placeOrderBtn.textContent = "Place your order";
                }
                completeCheckout({ razorpay_payment_id: response.razorpay_payment_id });
              }).catch(function (err) {
                console.warn("Supabase saveOrder failed, falling back to local:", err);
                saveOrderLocally();
                if (placeOrderBtn) {
                  placeOrderBtn.disabled = false;
                  placeOrderBtn.textContent = "Place your order";
                }
                completeCheckout({ razorpay_payment_id: response.razorpay_payment_id });
              });
            } else {
              saveOrderLocally();
              if (placeOrderBtn) {
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = "Place your order";
              }
              completeCheckout({ razorpay_payment_id: response.razorpay_payment_id });
            }
          },
          "modal": {
            "ondismiss": function () {
              if (placeOrderBtn) {
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = "Place your order";
              }
              showError("Payment window was closed. Please complete the online payment to place your order.");
            }
          }
        };

        try {
          var rzp = new Razorpay(options);
          if (typeof rzp.on === "function") {
            rzp.on('payment.failed', function (resp) {
              if (placeOrderBtn) {
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = "Place your order";
              }
              showError("Razorpay payment failed: " + (resp.error ? resp.error.description : "Please try again."));
            });
          }
          rzp.open();
        } catch (err) {
          if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = "Place your order";
          }
          console.warn("Razorpay init error, falling back to offline order:", err);
          saveOrderLocally();
          completeCheckout(null);
        }
      } else {
        // Direct / Offline order submission
        if (placeOrderBtn) {
          placeOrderBtn.disabled = true;
          placeOrderBtn.textContent = "Processing...";
        }

        if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
          window.maahiSupabase.saveOrder(orderPayload)
            .then(function () {
              saveOrderLocally();
              if (placeOrderBtn) {
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = "Place your order";
              }
              completeCheckout(null);
            })
            .catch(function (err) {
              console.warn("Supabase order insert failed, saving locally:", err);
              saveOrderLocally();
              if (placeOrderBtn) {
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = "Place your order";
              }
              completeCheckout(null);
            });
        } else {
          saveOrderLocally();
          if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = "Place your order";
          }
          completeCheckout(null);
        }
      }
    });
  }

  function renderStorefrontProducts() {
    if (!productGrid) return;
    productGrid.innerHTML = "";
    
    Object.keys(CATALOG).forEach(function (id) {
      var p = CATALOG[id];
      if (!p) return;
      
      var card = document.createElement("article");
      card.className = "product-card";
      card.setAttribute("data-product-id", id);
      
      var searchTerms = (id + " " + p.title + " " + (p.tag || "") + " " + (p.desc || "")).toLowerCase();
      card.setAttribute("data-search", searchTerms);
      
      var mediaHtml = '';
      if (p.image) {
        mediaHtml = '<div class="product-card-media" role="img" aria-label="" style="background-image: url(' + p.image + '); background-size: cover; background-position: center; background-repeat: no-repeat;"></div>';
      } else if (p.thumb) {
        mediaHtml = '<div class="product-card-media ' + p.thumb + '" role="img" aria-label=""></div>';
      } else {
        mediaHtml = '<div class="product-card-media product-card-media--default" role="img" aria-label="" style="background: linear-gradient(135deg, var(--accent), var(--gold)); opacity: 0.85; display:flex; align-items:center; justify-content:center; color:#fff; font-size:3rem; font-family:var(--font-display); font-weight:700;">🌱</div>';
      }
      
      var tagHtml = p.tag ? '<p class="product-tag">' + escapeHtml(p.tag) + '</p>' : '';
      var descHtml = p.desc ? '<p>' + escapeHtml(p.desc) + '</p>' : '';
      
      var featuresHtml = '';
      if (p.features && p.features.length > 0) {
        featuresHtml += '<ul>';
        p.features.forEach(function (feat) {
          featuresHtml += '<li>' + escapeHtml(feat) + '</li>';
        });
        featuresHtml += '</ul>';
      }
      
      card.innerHTML = 
        mediaHtml +
        '<h3>' + escapeHtml(p.title) + '</h3>' +
        tagHtml +
        descHtml +
        featuresHtml +
        '<div class="product-buy">' +
        '  <div class="product-price-row">' +
        '    <p class="product-price"><span class="currency">₹</span>' + p.price + '<span class="per">/ ' + escapeHtml(p.unitLabel || "item") + '</span></p>' +
        '    <span class="product-stock">In stock</span>' +
        '  </div>' +
        '  <div class="product-buy-row">' +
        '    <label class="sr-only" for="qty-' + id + '">Quantity</label>' +
        '    <input type="number" id="qty-' + id + '" class="qty-stepper" min="1" max="9999" value="1" data-qty-for="' + id + '">' +
        '    <button type="button" class="btn-add-cart" data-add="' + id + '">Add to Cart</button>' +
        '  </div>' +
        '</div>';
        
      productGrid.appendChild(card);
    });
  }

  if (resetBtn && form && success) {
    resetBtn.addEventListener("click", function () {
      form.reset();
      if (dateInput) dateInput.min = iso;
      if (success) success.hidden = true;
      form.classList.add("checkout-form-hidden");
      hideError();
      refreshAll();
      window.location.hash = "#products";
    });
  }

  renderStorefrontProducts();
  refreshAll();
  syncConsumerState();

  if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
    // Restore any active Supabase session
    window.maahiSupabase.getSession().then(function (res) {
      var session = res.data ? res.data.session : null;
      if (session && session.user) {
        var email = session.user.email;
        var config = window.MAAHI_CONFIG || {};
        var adminEmail = config.adminEmail || "admin@maahiproducts.com";
        var contractorEmail = config.contractorEmail || "contractor@maahiproducts.com";
        
        if (email === adminEmail || email === contractorEmail) {
          var role = "Contractor";
          if (email === adminEmail) {
            role = "Administrator";
          }
          var profile = {
            name: session.user.user_metadata.full_name || email.split("@")[0],
            role: role,
            email: email
          };
          var AUTH_KEY = "maahi_owner_auth_token";
          sessionStorage.setItem(AUTH_KEY, session.access_token);
          sessionStorage.setItem("maahi_user_profile", JSON.stringify(profile));
          window.location.href = "owner/dashboard.html";
          return;
        }

        var metaName = session.user.user_metadata ? (session.user.user_metadata.full_name || session.user.user_metadata.name) : null;
        var user = {
          name: metaName || email.split("@")[0],
          email: email,
          addresses: []
        };
        var currentConsumer = getConsumer();
        if (currentConsumer && currentConsumer.email === user.email) {
          user.addresses = currentConsumer.addresses || [];
        }
        setConsumer(user);
        refreshAll();
        renderProfile();
      }
    }).catch(function (err) {
      console.warn("Failed to check Supabase session on load:", err);
    });

    // Listen to authentication changes
    window.maahiSupabase.onAuthStateChange(function (event, session) {
      if (session && session.user) {
        var email = session.user.email;
        var config = window.MAAHI_CONFIG || {};
        var adminEmail = config.adminEmail || "admin@maahiproducts.com";
        var contractorEmail = config.contractorEmail || "contractor@maahiproducts.com";
        
        if (email === adminEmail || email === contractorEmail) {
          var role = "Contractor";
          if (email === adminEmail) {
            role = "Administrator";
          }
          var profile = {
            name: session.user.user_metadata.full_name || email.split("@")[0],
            role: role,
            email: email
          };
          var AUTH_KEY = "maahi_owner_auth_token";
          sessionStorage.setItem(AUTH_KEY, session.access_token);
          sessionStorage.setItem("maahi_user_profile", JSON.stringify(profile));
          window.location.href = "owner/dashboard.html";
          return;
        }

        var metaName = session.user.user_metadata ? (session.user.user_metadata.full_name || session.user.user_metadata.name) : null;
        var user = {
          name: metaName || email.split("@")[0],
          email: email,
          addresses: []
        };
        var currentConsumer = getConsumer();
        if (currentConsumer && currentConsumer.email === user.email) {
          user.addresses = currentConsumer.addresses || [];
        }
        setConsumer(user);
        refreshAll();
        renderProfile();
      } else if (event === "SIGNED_OUT") {
        setConsumer(null);
        refreshAll();
        renderProfile();
      }
    });

    window.maahiSupabase.fetchCatalog().then(function (dbCatalog) {
      if (dbCatalog) {
        localStorage.setItem(CATALOG_KEY, JSON.stringify(dbCatalog));
        CATALOG = dbCatalog;
        renderStorefrontProducts();
        refreshAll();
      }
    }).catch(function (err) {
      console.warn("Failed to fetch catalog from Supabase on load:", err);
    });
  }
  window.maahiInitialized = true;
})();
