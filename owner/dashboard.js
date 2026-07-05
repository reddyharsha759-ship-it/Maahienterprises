(function () {
  var ORDERS_KEY = "glc_orders_v1";
  var AUTH_KEY = "maahi_owner_auth_token";
  var CATALOG_KEY = "glc_catalog_v1";
  var PROFILE_KEY = "maahi_user_profile";

  // Load User Profile
  function loadUserProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY) || sessionStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : { name: "Maahi Admin", role: "Administrator" };
    } catch (e) {
      return { name: "Maahi Admin", role: "Administrator" };
    }
  }

  var nameEl = document.getElementById("user-name");
  var roleEl = document.getElementById("user-role");
  var avatarEl = document.getElementById("user-avatar");

  function updateProfileUI(profile) {
    if (!profile) return;
    if (nameEl) nameEl.textContent = profile.name;
    if (roleEl) roleEl.textContent = profile.role;
    if (avatarEl && profile.name) {
      var parts = profile.name.trim().split(" ");
      var initials = parts.length > 1 ? parts[parts.length - 1].charAt(0) : parts[0].charAt(0);
      avatarEl.textContent = initials.toUpperCase();
    }
  }

  var activeUser = loadUserProfile();
  updateProfileUI(activeUser);

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

  function loadCatalog() {
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

  function saveCatalog(catalog) {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  }

  function refreshOrdersData() {
    renderTable();

    if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
      window.maahiSupabase.fetchOrders().then(function (dbOrders) {
        if (dbOrders) {
          saveOrders(dbOrders);
          renderTable();
        }
      }).catch(function (err) {
        console.warn("Supabase fetch orders failed:", err);
      });
    }
  }

  function refreshCatalogData() {
    renderInventoryTable();

    if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
      window.maahiSupabase.fetchCatalog().then(function (dbCatalog) {
        if (dbCatalog) {
          saveCatalog(dbCatalog);
          renderInventoryTable();
        }
      }).catch(function (err) {
        console.warn("Supabase fetch catalog failed:", err);
      });
    }
  }

  function updateDatabaseUI() {
    var urlInp = document.getElementById("db-url");
    var keyInp = document.getElementById("db-key");
    var rzpKeyInp = document.getElementById("db-razorpay-key");
    var indicator = document.getElementById("db-status-indicator");
    var label = document.getElementById("db-status-label");
    var desc = document.getElementById("db-status-desc");
    var syncBtn = document.getElementById("btn-db-sync");

    var url = (window.MAAHI_CONFIG && window.MAAHI_CONFIG.supabaseUrl) || localStorage.getItem("maahi_supabase_url") || "";
    var key = (window.MAAHI_CONFIG && window.MAAHI_CONFIG.supabaseAnonKey) || localStorage.getItem("maahi_supabase_key") || "";
    var rzpKey = (window.MAAHI_CONFIG && window.MAAHI_CONFIG.razorpayKeyId) || localStorage.getItem("maahi_razorpay_key") || "";

    if (urlInp) urlInp.value = url;
    if (keyInp) keyInp.value = key;
    if (rzpKeyInp) rzpKeyInp.value = rzpKey;

    var oauthCheck = document.getElementById("db-use-real-oauth");
    if (oauthCheck) {
      var useRealOAuth = (window.MAAHI_CONFIG && window.MAAHI_CONFIG.useRealGoogleOAuth) || (localStorage.getItem("maahi_use_real_google_oauth") === "true");
      oauthCheck.checked = useRealOAuth;
    }

    if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
      if (indicator) indicator.style.backgroundColor = "#067d17";
      if (label) label.textContent = "Connected";
      if (desc) desc.textContent = "Successfully connected to your Supabase project.";
      if (syncBtn) syncBtn.disabled = false;
    } else {
      if (indicator) indicator.style.backgroundColor = "#cbd5e1";
      if (label) label.textContent = "Disconnected";
      if (desc) desc.textContent = "Currently utilizing LocalStorage.";
      if (syncBtn) syncBtn.disabled = true;
    }
  }

  // 1. Authorization check
  var hasHashToken = window.location.hash && (window.location.hash.indexOf("access_token=") !== -1 || window.location.hash.indexOf("error=") !== -1);
  if (!sessionStorage.getItem(AUTH_KEY) && !localStorage.getItem(AUTH_KEY) && !hasHashToken) {
    window.location.replace("login.html");
    return;
  }

  // 2. Warning message check for local files
  if (typeof location !== "undefined" && location.protocol === "file:") {
    var warn = document.getElementById("file-protocol-warning");
    if (warn) warn.hidden = false;
  }

  // 3. Document Elements
  var btnExport = document.getElementById("btn-export");
  var btnLogout = document.getElementById("btn-logout");
  var orderSearch = document.getElementById("order-search");
  var statusFilter = document.getElementById("status-filter");
  var tbody = document.getElementById("orders-tbody");
  var ordersEmpty = document.getElementById("orders-empty");
  var ordersTable = document.getElementById("orders-table");
  var dashStats = document.getElementById("dash-stats");
  
  // Drawer Elements
  var drawerOverlay = document.getElementById("drawer-overlay");
  var orderDrawer = document.getElementById("order-drawer");
  var drawerTitle = document.getElementById("drawer-title");
  var drawerBody = document.getElementById("detail-body");
  var drawerClose = document.getElementById("detail-close");

  // 4. Data Layer Functions
  function loadOrders() {
    try {
      var raw = localStorage.getItem(ORDERS_KEY);
      var data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  function formatMoney(n) {
    return "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
  }

  function formatDate(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      return d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (e) {
      return iso;
    }
  }

  function statusClass(s) {
    return "status-pill status-" + (s || "new");
  }

  function escapeHtml(str) {
    var d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  // 5. Calculations & Renderer Functions
  function renderStats(orders) {
    if (!dashStats) return;
    
    var total = orders.length;
    var revenue = orders.reduce(function (sum, o) {
      return sum + (Number(o.subtotal) || 0);
    }, 0);
    
    // Calculate today's orders (last 24 hours)
    var start = new Date();
    start.setHours(0, 0, 0, 0);
    var today = orders.filter(function (o) {
      return o.createdAt && new Date(o.createdAt) >= start;
    }).length;
    
    // Active deliveries (new, confirmed, processing, shipped)
    var activeCount = orders.filter(function (o) {
      var s = o.status || "new";
      return s === "new" || s === "confirmed" || s === "processing" || s === "shipped";
    }).length;

    var html = "";
    
    // Total Orders
    html += '<article class="metric-card">';
    html += '  <div class="card-info">';
    html += '    <p class="label">Total Orders</p>';
    html += '    <p class="value">' + total + '</p>';
    html += '    <span class="trend-badge"><span aria-hidden="true">↑</span> 100% lifetime</span>';
    html += '  </div>';
    html += '  <div class="card-icon-bg" aria-hidden="true">📦</div>';
    html += '</article>';
    
    // Gross Revenue
    html += '<article class="metric-card">';
    html += '  <div class="card-info">';
    html += '    <p class="label">Gross Revenue</p>';
    html += '    <p class="value">' + formatMoney(revenue) + '</p>';
    html += '    <span class="trend-badge"><span aria-hidden="true">↑</span> Organic Sales</span>';
    html += '  </div>';
    html += '  <div class="card-icon-bg" aria-hidden="true">₹</div>';
    html += '</article>';
    
    // Active Fulfillment
    html += '<article class="metric-card">';
    html += '  <div class="card-info">';
    html += '    <p class="label">Active Fulfillment</p>';
    html += '    <p class="value">' + activeCount + '</p>';
    var fulfillLabel = activeCount > 0 ? "Pending action" : "All clear";
    html += '    <span class="trend-badge ' + (activeCount > 0 ? 'up' : '') + '">' + fulfillLabel + '</span>';
    html += '  </div>';
    html += '  <div class="card-icon-bg" aria-hidden="true">🚚</div>';
    html += '</article>';
    
    dashStats.innerHTML = html;
  }

  // 6. SVG Line Chart Generator
  function renderSVGChart(filteredOrders) {
    var container = document.getElementById("analytics-chart-container");
    if (!container) return;

    if (filteredOrders.length === 0) {
      container.innerHTML = '<div class="chart-loading-placeholder">No data matches the selected filters.</div>';
      return;
    }

    // Group by date
    var groups = {};
    filteredOrders.forEach(function (o) {
      if (!o.createdAt) return;
      var dStr = o.createdAt.slice(0, 10);
      if (!groups[dStr]) groups[dStr] = { revenue: 0, count: 0 };
      groups[dStr].revenue += Number(o.subtotal) || 0;
      groups[dStr].count += 1;
    });

    var dates = Object.keys(groups).sort();
    
    // Limit to last 7 dates for cleaner representation
    if (dates.length > 7) {
      dates = dates.slice(dates.length - 7);
    }

    if (dates.length === 0) {
      container.innerHTML = '<div class="chart-loading-placeholder">No orders with date records found.</div>';
      return;
    }

    // If only 1 date, pad it for visualization purposes
    if (dates.length === 1) {
      var parts = dates[0].split("-");
      var d0 = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d0.setDate(d0.getDate() - 1);
      
      var yyyy = d0.getFullYear();
      var mm = d0.getMonth() + 1;
      var dd = d0.getDate();
      var prevStr = yyyy + "-" + (mm < 10 ? "0" + mm : mm) + "-" + (dd < 10 ? "0" + dd : dd);
      
      groups[prevStr] = { revenue: 0, count: 0 };
      dates.unshift(prevStr);
    }

    var width = container.clientWidth || 600;
    var height = 300;
    var paddingLeft = 65;
    var paddingRight = 50;
    var paddingTop = 30;
    var paddingBottom = 40;

    var chartWidth = width - paddingLeft - paddingRight;
    var chartHeight = height - paddingTop - paddingBottom;

    var maxRev = 0;
    var maxCount = 0;
    dates.forEach(function (d) {
      if (groups[d].revenue > maxRev) maxRev = groups[d].revenue;
      if (groups[d].count > maxCount) maxCount = groups[d].count;
    });

    // Fallbacks if zero
    if (maxRev === 0) maxRev = 1000;
    if (maxCount === 0) maxCount = 5;

    // X coordinate mapping
    var xCoords = [];
    dates.forEach(function (d, i) {
      var pct = dates.length > 1 ? i / (dates.length - 1) : 0.5;
      xCoords.push(paddingLeft + pct * chartWidth);
    });

    // Y coordinates mapping (revenue - dual axis left, orders - dual axis right)
    var revY = [];
    var countY = [];
    dates.forEach(function (d) {
      var revPct = groups[d].revenue / maxRev;
      var countPct = groups[d].count / maxCount;
      revY.push(paddingTop + (1 - revPct) * chartHeight);
      countY.push(paddingTop + (1 - countPct) * chartHeight);
    });

    // Construct SVG
    var svg = '<svg width="100%" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" style="background:transparent; overflow:visible;">';
    
    // Defs (Gradients)
    svg += '<defs>';
    svg += '  <linearGradient id="revenue-glow" x1="0" y1="0" x2="0" y2="1">';
    svg += '    <stop offset="0%" stop-color="#52b788" stop-opacity="0.22" />';
    svg += '    <stop offset="100%" stop-color="#52b788" stop-opacity="0.0" />';
    svg += '  </linearGradient>';
    svg += '</defs>';

    // Grid lines & Y Axis labels (4 horizontal divisions)
    var divisions = 4;
    for (var k = 0; k <= divisions; k++) {
      var pctVal = k / divisions;
      var yVal = paddingTop + pctVal * chartHeight;
      var revVal = Math.round(maxRev * (1 - pctVal));
      var countVal = Math.round(maxCount * (1 - pctVal));
      
      // Grid lines
      svg += '<line class="chart-grid-line" x1="' + paddingLeft + '" y1="' + yVal + '" x2="' + (width - paddingRight) + '" y2="' + yVal + '" />';
      
      // Left axis labels (Revenue)
      svg += '<text class="chart-axis-text" x="' + (paddingLeft - 10) + '" y="' + (yVal + 3) + '" text-anchor="end">₹' + revVal.toLocaleString("en-IN") + '</text>';
      
      // Right axis labels (Orders)
      svg += '<text class="chart-axis-text" x="' + (width - paddingRight + 10) + '" y="' + (yVal + 3) + '" text-anchor="start">' + countVal + ' ord</text>';
    }

    // Draw Revenue filled area
    var areaPath = 'M' + xCoords[0] + ',' + (paddingTop + chartHeight) + ' ';
    dates.forEach(function (d, i) {
      areaPath += 'L' + xCoords[i] + ',' + revY[i] + ' ';
    });
    areaPath += 'L' + xCoords[xCoords.length - 1] + ',' + (paddingTop + chartHeight) + ' Z';
    svg += '<path class="chart-gradient-revenue" d="' + areaPath + '" />';

    // Draw Revenue line
    var linePath = 'M' + xCoords[0] + ',' + revY[0] + ' ';
    dates.forEach(function (d, i) {
      if (i > 0) linePath += 'L' + xCoords[i] + ',' + revY[i] + ' ';
    });
    svg += '<path class="chart-line-revenue" d="' + linePath + '" />';

    // Draw Orders line
    var ordersLinePath = 'M' + xCoords[0] + ',' + countY[0] + ' ';
    dates.forEach(function (d, i) {
      if (i > 0) ordersLinePath += 'L' + xCoords[i] + ',' + countY[i] + ' ';
    });
    svg += '<path class="chart-line-orders" d="' + ordersLinePath + '" />';

    // Draw nodes and X labels
    dates.forEach(function (d, i) {
      var parts = d.split("-");
      var labelDate = parts[2] + "/" + parts[1];
      
      // X Axis text labels
      svg += '<text class="chart-axis-text" x="' + xCoords[i] + '" y="' + (height - 10) + '" text-anchor="middle">' + labelDate + '</text>';
      
      // Revenue nodes
      svg += '<circle class="chart-node chart-node-revenue" cx="' + xCoords[i] + '" cy="' + revY[i] + '" r="5">';
      svg += '  <title>Date: ' + d + '\nRevenue: ₹' + groups[d].revenue.toLocaleString("en-IN") + '</title>';
      svg += '</circle>';

      // Orders nodes
      svg += '<circle class="chart-node chart-node-orders" cx="' + xCoords[i] + '" cy="' + countY[i] + '" r="4">';
      svg += '  <title>Date: ' + d + '\nOrders: ' + groups[d].count + '</title>';
      svg += '</circle>';
    });

    svg += '</svg>';
    container.innerHTML = svg;
  }

  // 7. Filtering Orders
  function getFilteredOrders() {
    var orders = loadOrders();
    var q = (orderSearch && orderSearch.value.trim().toLowerCase()) || "";
    var st = (statusFilter && statusFilter.value) || "";
    return orders.filter(function (o) {
      if (st && (o.status || "new") !== st) return false;
      if (!q) return true;
      var blob =
        (o.id || "") +
        " " +
        (o.customer && o.customer.name) +
        " " +
        (o.customer && o.customer.email) +
        " " +
        (o.customer && o.customer.fulfillment);
      return String(blob).toLowerCase().indexOf(q) !== -1;
    });
  }

  function updateOrderStatus(orderId, newStatus) {
    var orders = loadOrders();
    var changed = false;
    orders.forEach(function (o) {
      if (o.id === orderId) {
        o.status = newStatus;
        o.statusUpdatedAt = new Date().toISOString();
        changed = true;
      }
    });
    if (changed) {
      saveOrders(orders);
      
      if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
        window.maahiSupabase.updateOrderStatus(orderId, newStatus).then(function () {
          var currentOrders = loadOrders();
          renderStats(currentOrders);
          renderTable();
        }).catch(function (err) {
          console.warn("Failed to sync order status update to Supabase:", err);
          var currentOrders = loadOrders();
          renderStats(currentOrders);
          renderTable();
        });
      } else {
        var currentOrders = loadOrders();
        renderStats(currentOrders);
        renderTable();
      }
    }
  }

  // 8. Slide-out Side Drawer Details Panel
  function openDetail(order) {
    if (!drawerBody || !orderDrawer || !drawerOverlay || !drawerTitle) return;
    
    drawerTitle.textContent = order.id;
    
    var c = order.customer || {};
    var lines = order.lines || [];
    var html = "";
    
    // Status Action Selector
    html += '<div class="status-update-box">';
    html += '  <label for="drawer-status-select">Order Status</label>';
    html += '  <select id="drawer-status-select" class="status-update-select" data-order-id="' + order.id + '">';
    ["new", "confirmed", "processing", "shipped", "delivered", "cancelled"].forEach(function (v) {
      var selected = (v === (order.status || "new")) ? "selected" : "";
      html += '    <option value="' + v + '" ' + selected + '>' + v.charAt(0).toUpperCase() + v.slice(1) + '</option>';
    });
    html += '  </select>';
    html += '</div>';

    // Metrics Timeline
    html += '<section class="detail-section">';
    html += '  <h3 class="detail-section-title">Timeline Info</h3>';
    html += '  <div class="detail-row"><span class="detail-label">Placed At</span><span class="detail-val">' + escapeHtml(formatDate(order.createdAt)) + '</span></div>';
    if (order.statusUpdatedAt) {
      html += '  <div class="detail-row"><span class="detail-label">Status Updated</span><span class="detail-val">' + escapeHtml(formatDate(order.statusUpdatedAt)) + '</span></div>';
    }
    html += '  <div class="detail-row"><span class="detail-label">Status Summary</span><span class="detail-val"><span class="status-pill status-' + (order.status || "new") + '">' + (order.status || "new") + '</span></span></div>';
    if (c.razorpay_payment_id) {
      html += '  <div class="detail-row"><span class="detail-label">Razorpay ID</span><span class="detail-val mono" style="color:var(--gold); font-weight:600;">' + escapeHtml(c.razorpay_payment_id) + '</span></div>';
    }
    html += '</section>';

    // Customer Profile Info
    html += '<section class="detail-section">';
    html += '  <h3 class="detail-section-title">Customer Profile</h3>';
    html += '  <div class="detail-row"><span class="detail-label">Name</span><span class="detail-val">' + escapeHtml(c.name || "—") + '</span></div>';
    html += '  <div class="detail-row"><span class="detail-label">Email</span><span class="detail-val">' + escapeHtml(c.email || "—") + '</span></div>';
    if (c.phone) {
      html += '  <div class="detail-row"><span class="detail-label">Phone Number</span><span class="detail-val">' + escapeHtml(c.phone) + '</span></div>';
    }
    html += '</section>';

    // Delivery & Logistic Notes
    html += '<section class="detail-section">';
    html += '  <h3 class="detail-section-title">Fulfillment Details</h3>';
    var fulfillMap = {
      ship: "Deliver to Location",
      pickup: "Customer Arrange Pickup",
      export: "Export Documentation Request",
      quote: "Quote Request Only"
    };
    var fulfillText = fulfillMap[c.fulfillment] || c.fulfillment || "—";
    html += '  <div class="detail-row"><span class="detail-label">Fulfillment type</span><span class="detail-val">' + escapeHtml(fulfillText) + '</span></div>';
    html += '  <div class="detail-row"><span class="detail-label">Target Date</span><span class="detail-val">' + escapeHtml(c.target_date || "—") + '</span></div>';
    if (c.region) {
      html += '  <div class="detail-row"><span class="detail-label">City / Region</span><span class="detail-val">' + escapeHtml(c.region) + '</span></div>';
    }
    if (c.address) {
      html += '  <div class="detail-row" style="flex-direction: column; align-items: flex-start; gap: 0.25rem;">';
      html += '    <span class="detail-label">Full Street Address</span>';
      html += '    <span class="detail-val" style="text-align: left; font-size: 0.85rem; line-height: 1.4; color: #d0ded6;">' + escapeHtml(c.address).replace(/\n/g, "<br>") + '</span>';
      html += '  </div>';
    }
    if (c.notes) {
      html += '  <div class="detail-row" style="flex-direction: column; align-items: flex-start; gap: 0.25rem; margin-top: 0.5rem;">';
      html += '    <span class="detail-label">Order Notes</span>';
      html += '    <span class="detail-val" style="text-align: left; font-size: 0.85rem; line-height: 1.4; color: #d0ded6;">' + escapeHtml(c.notes).replace(/\n/g, "<br>") + '</span>';
      html += '  </div>';
    }
    html += '</section>';

    // Items list
    html += '<section class="detail-section">';
    html += '  <h3 class="detail-section-title">Line items</h3>';
    html += '  <ul class="drawer-lines">';
    lines.forEach(function (l) {
      var itemTotal = l.lineTotal != null ? l.lineTotal : (l.unitPrice || 0) * (l.qty || 0);
      html += '    <li>';
      html += '      <div>';
      html += '        <span class="line-title">' + escapeHtml(l.title || l.id) + '</span>';
      html += '        <span class="line-qty">× ' + l.qty + '</span>';
      html += '      </div>';
      html += '      <span class="line-price">' + formatMoney(itemTotal) + '</span>';
      html += '    </li>';
    });
    html += '  </ul>';
    html += '  <div class="drawer-subtotal">';
    html += '    <span>Subtotal</span>';
    html += '    <span class="drawer-subtotal-val">' + formatMoney(order.subtotal) + '</span>';
    html += '  </div>';
    html += '</section>';

    drawerBody.innerHTML = html;

    // Attach local selector action change
    var statusSelect = drawerBody.querySelector("#drawer-status-select");
    if (statusSelect) {
      statusSelect.addEventListener("change", function () {
        updateOrderStatus(order.id, statusSelect.value);
        // Reload fresh copy
        var currentOrders = loadOrders();
        var freshOrder = null;
        for (var i = 0; i < currentOrders.length; i++) {
          if (currentOrders[i].id === order.id) {
            freshOrder = currentOrders[i];
            break;
          }
        }
        if (freshOrder) {
          openDetail(freshOrder);
        }
      });
    }

    // Animate display open
    orderDrawer.classList.add("is-open");
    orderDrawer.setAttribute("aria-hidden", "false");
    drawerOverlay.classList.add("is-visible");
    drawerOverlay.setAttribute("aria-hidden", "false");
  }

  function closeDetail() {
    if (orderDrawer) {
      orderDrawer.classList.remove("is-open");
      orderDrawer.setAttribute("aria-hidden", "true");
    }
    if (drawerOverlay) {
      drawerOverlay.classList.remove("is-visible");
      drawerOverlay.setAttribute("aria-hidden", "true");
    }
  }

  // 9. Table Row Renderer
  function renderTable() {
    var filtered = getFilteredOrders();
    var allOrders = loadOrders();
    
    // Update Stats & Graph
    renderStats(allOrders);
    var tabOverview = document.getElementById("tab-overview");
    if (tabOverview && tabOverview.style.display !== "none") {
      renderSVGChart(filtered);
    }
    
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!filtered.length) {
      if (ordersEmpty) ordersEmpty.removeAttribute("hidden");
      if (ordersTable) ordersTable.hidden = true;
      return;
    }
    
    if (ordersEmpty) ordersEmpty.setAttribute("hidden", "true");
    if (ordersTable) ordersTable.hidden = false;

    filtered.forEach(function (o) {
      var tr = document.createElement("tr");
      var c = o.customer || {};
      var st = o.status || "new";
      
      var dt = formatDate(o.createdAt);
      var amountVal = formatMoney(o.subtotal);
      
      var fulfillText = c.fulfillment === "ship" ? "Delivery" :
                        c.fulfillment === "pickup" ? "Pickup" :
                        c.fulfillment === "export" ? "Export" : "Quote";
      var dateLabel = c.target_date || "—";

      tr.innerHTML =
        '<td><span class="mono">' + escapeHtml(o.id) + '</span></td>' +
        '<td>' + escapeHtml(dt) + '</td>' +
        '<td class="customer-cell"><strong>' + escapeHtml(c.name || "—") + '</strong><span>' + escapeHtml(c.email || "") + '</span></td>' +
        '<td><span class="amount-text">' + amountVal + '</span></td>' +
        '<td><strong>' + escapeHtml(fulfillText) + '</strong><span style="display:block; font-size:0.75rem; color:var(--text-muted);">' + escapeHtml(dateLabel) + '</span></td>' +
        '<td><span class="' + statusClass(st) + '">' + escapeHtml(st) + '</span></td>' +
        '<td style="text-align: right;"></td>';
      
      var actionCell = tr.querySelector("td:last-child");
      var viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "btn-small";
      viewBtn.textContent = "View";
      viewBtn.addEventListener("click", function () {
        openDetail(o);
      });
      
      actionCell.appendChild(viewBtn);
      tbody.appendChild(tr);
    });
  }

  // --- INVENTORY MANAGEMENT ---

  function renderInventoryTable() {
    var catalog = loadCatalog();
    var invTbody = document.getElementById("inventory-tbody");
    if (!invTbody) return;
    
    invTbody.innerHTML = "";
    
    var keys = Object.keys(catalog);
    if (keys.length === 0) {
      var tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">No products found in inventory. Add one to get started!</td>';
      invTbody.appendChild(tr);
      return;
    }
    
    keys.forEach(function (id) {
      var p = catalog[id];
      if (!p) return;
      
      var tr = document.createElement("tr");
      
      var thumbHtml = "";
      if (p.image) {
        thumbHtml = '<div class="cart-line-thumb" style="width:40px; height:40px; border-radius:6px; flex-shrink:0; background-image: url(' + p.image + '); background-size: cover; background-position: center; background-repeat: no-repeat;"></div>';
      } else if (p.thumb) {
        thumbHtml = '<div class="cart-line-thumb ' + p.thumb + '" style="width:40px; height:40px; border-radius:6px; flex-shrink:0;"></div>';
      } else {
        thumbHtml = '<div class="cart-line-thumb" style="width:40px; height:40px; border-radius:6px; flex-shrink:0; background: linear-gradient(135deg, var(--accent), var(--gold)); display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.25rem;">🌱</div>';
      }
      
      var tagLabel = p.tag ? '<span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-top: 0.15rem;">' + escapeHtml(p.tag) + '</span>' : '';
      
      tr.innerHTML =
        '<td>' +
        '  <div style="display:flex; align-items:center; gap: 0.75rem;">' +
        thumbHtml +
        '    <div>' +
        '      <strong style="display:block; color:#fff;">' + escapeHtml(p.title) + '</strong>' +
        tagLabel +
        '    </div>' +
        '  </div>' +
        '</td>' +
        '<td><span class="mono">' + escapeHtml(id) + '</span></td>' +
        '<td><span class="amount-text" style="color:var(--accent); font-weight:700;">₹' + Math.round(p.price).toLocaleString("en-IN") + '</span></td>' +
        '<td>' + escapeHtml(p.unitLabel || "item") + '</td>' +
        '<td style="text-align: right;">' +
        '  <div style="display:flex; gap:0.5rem; justify-content:flex-end;">' +
        '    <button type="button" class="btn-small btn-edit-product">Edit</button>' +
        '    <button type="button" class="btn-small btn-delete-product" style="border-color: rgba(248, 113, 113, 0.25); color: var(--rose);">Delete</button>' +
        '  </div>' +
        '</td>';
        
      tr.querySelector(".btn-edit-product").addEventListener("click", function () {
        openProductDrawer(id, p);
      });
      
      tr.querySelector(".btn-delete-product").addEventListener("click", function () {
        if (confirm("Are you sure you want to delete the product '" + p.title + "'?")) {
          deleteProduct(id);
        }
      });
      
      invTbody.appendChild(tr);
    });
  }

  var productDrawer = document.getElementById("product-drawer");
  var productForm = document.getElementById("product-form");
  var productDrawerTitle = document.getElementById("product-drawer-title");
  var btnAddProduct = document.getElementById("btn-add-product");
  var productClose = document.getElementById("product-close");
  var btnCancelProduct = document.getElementById("btn-cancel-product");
  var productFormError = document.getElementById("product-form-error");

  var currentUploadedBase64 = "";

  function openProductDrawer(id, product) {
    if (!productDrawer || !productForm || !productDrawerTitle) return;
    
    if (productFormError) {
      productFormError.hidden = true;
      productFormError.textContent = "";
    }
    
    var idField = document.getElementById("prod-id");
    var fileInp = document.getElementById("prod-image-file");
    var urlInp = document.getElementById("prod-image-url");
    var preview = document.getElementById("prod-image-preview");
    
    currentUploadedBase64 = "";
    if (fileInp) fileInp.value = "";
    if (urlInp) urlInp.value = "";
    if (preview) {
      preview.style.backgroundImage = "";
      preview.textContent = "No photo selected";
    }
    
    if (id && product) {
      productDrawerTitle.textContent = "Edit Product: " + id;
      productForm.elements["id"].value = id;
      productForm.elements["id"].readOnly = true;
      if (idField) {
        idField.style.opacity = "0.6";
        idField.style.cursor = "not-allowed";
      }
      productForm.elements["title"].value = product.title;
      productForm.elements["price"].value = product.price;
      productForm.elements["unitLabel"].value = product.unitLabel || "block";
      productForm.elements["tag"].value = product.tag || "";
      productForm.elements["desc"].value = product.desc || "";
      productForm.elements["features"].value = (product.features || []).join("\n");
      productForm.elements["thumb"].value = product.thumb || "";
      
      if (product.image) {
        if (urlInp) urlInp.value = product.image.startsWith("data:") ? "" : product.image;
        if (product.image.startsWith("data:")) {
          currentUploadedBase64 = product.image;
        }
        if (preview) {
          preview.style.backgroundImage = "url(" + product.image + ")";
          preview.textContent = "";
        }
      }
    } else {
      productDrawerTitle.textContent = "Add New Product";
      productForm.reset();
      productForm.elements["id"].value = "";
      productForm.elements["id"].readOnly = false;
      if (idField) {
        idField.style.opacity = "1";
        idField.style.cursor = "text";
      }
    }
    
    productDrawer.style.display = "flex";
    setTimeout(function () {
      productDrawer.classList.add("is-open");
    }, 10);
    
    if (drawerOverlay) {
      drawerOverlay.classList.add("is-visible");
      drawerOverlay.setAttribute("aria-hidden", "false");
    }
  }

  function closeProductDrawer() {
    if (productDrawer) {
      productDrawer.classList.remove("is-open");
      setTimeout(function () {
        productDrawer.style.display = "none";
      }, 350);
    }
    if (drawerOverlay) {
      if (orderDrawer && !orderDrawer.classList.contains("is-open")) {
        drawerOverlay.classList.remove("is-visible");
        drawerOverlay.setAttribute("aria-hidden", "true");
      }
    }
  }

  function showProductError(msg) {
    if (productFormError) {
      productFormError.textContent = msg;
      productFormError.hidden = false;
    }
  }

  function deleteProduct(id) {
    var catalog = loadCatalog();
    if (catalog[id]) {
      if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
        window.maahiSupabase.deleteProduct(id).then(function () {
          delete catalog[id];
          saveCatalog(catalog);
          renderInventoryTable();
        }).catch(function (err) {
          alert("Failed to delete product from Supabase: " + (err.message || err));
        });
      } else {
        delete catalog[id];
        saveCatalog(catalog);
        renderInventoryTable();
      }
    }
  }

  // --- EXPORT DATA LOGIC (EXCEL & PDF) ---

  function downloadCSV(csvContent, filename) {
    var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function printDataAsPDF(title, headers, rows) {
    var printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export PDF.");
      return;
    }
    
    var html = '<!DOCTYPE html><html><head><title>' + title + '</title>';
    html += '<style>';
    html += 'body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }';
    html += 'h1 { font-family: Georgia, serif; color: #1c2b24; margin-bottom: 5px; }';
    html += '.subtitle { color: #666; font-size: 0.9rem; margin-bottom: 25px; }';
    html += 'table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.85rem; }';
    html += 'th, td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; }';
    html += 'th { background-color: #f2f2f2; font-weight: bold; color: #444; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }';
    html += 'tr:nth-child(even) { background-color: #fafafa; }';
    html += '.footer { margin-top: 30px; font-size: 0.8rem; color: #888; border-top: 1px solid #eee; padding-top: 10px; text-align: center; }';
    html += '</style></head><body>';
    
    html += '<h1>' + title + '</h1>';
    html += '<div class="subtitle">Generated on ' + new Date().toLocaleString() + '</div>';
    
    html += '<table><thead><tr>';
    headers.forEach(function (h) {
      html += '<th>' + h + '</th>';
    });
    html += '</tr></thead><tbody>';
    
    rows.forEach(function (row) {
      html += '<tr>';
      row.forEach(function (cell) {
        html += '<td>' + cell + '</td>';
      });
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    html += '<div class="footer">MAAHI PRODUCTS — Owner Console Report &copy; ' + new Date().getFullYear() + '</div>';
    html += '<script>window.onload = function() { window.print(); window.close(); };</script>';
    html += '</body></html>';
    
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function exportOrdersExcel() {
    var orders = loadOrders();
    if (orders.length === 0) {
      alert("No orders data to export.");
      return;
    }
    
    var csv = ["Order ID,Date Placed,Customer Name,Customer Email,Customer Phone,Fulfillment,Target Date,Order Value (₹),Status"];
    
    orders.forEach(function (o) {
      var c = o.customer || {};
      var dateStr = o.createdAt ? new Date(o.createdAt).toLocaleString().replace(/,/g, "") : "";
      var row = [
        o.id || "",
        dateStr,
        c.name || "",
        c.email || "",
        c.phone || "",
        c.fulfillment || "",
        c.target_date || "",
        o.subtotal || 0,
        o.status || "new"
      ];
      
      var rowStr = row.map(function (val) {
        var stringVal = String(val);
        if (stringVal.indexOf(",") !== -1 || stringVal.indexOf('"') !== -1 || stringVal.indexOf("\n") !== -1) {
          return '"' + stringVal.replace(/"/g, '""') + '"';
        }
        return stringVal;
      }).join(",");
      
      csv.push(rowStr);
    });
    
    downloadCSV(csv.join("\n"), "maahi-orders-" + new Date().toISOString().slice(0, 10) + ".csv");
  }

  function exportOrdersPDF() {
    var orders = loadOrders();
    if (orders.length === 0) {
      alert("No orders data to export.");
      return;
    }
    
    var headers = ["Order ID", "Date Placed", "Customer Info", "Order Value", "Fulfillment", "Status"];
    var rows = orders.map(function (o) {
      var c = o.customer || {};
      var dt = formatDate(o.createdAt);
      var amountVal = formatMoney(o.subtotal);
      var fulfillText = c.fulfillment === "ship" ? "Delivery" :
                        c.fulfillment === "pickup" ? "Pickup" :
                        c.fulfillment === "export" ? "Export" : "Quote";
      var dateLabel = c.target_date || "—";
      return [
        o.id || "",
        dt,
        (c.name || "—") + " (" + (c.email || "") + ")",
        amountVal,
        fulfillText + " (" + dateLabel + ")",
        o.status || "new"
      ];
    });
    
    printDataAsPDF("MAAHI PRODUCTS — Orders Report", headers, rows);
  }

  function exportInventoryExcel() {
    var catalog = loadCatalog();
    var keys = Object.keys(catalog);
    if (keys.length === 0) {
      alert("No inventory data to export.");
      return;
    }
    
    var csv = ["Product ID,Title,Price (₹),Unit Label,Tag,Description"];
    
    keys.forEach(function (id) {
      var p = catalog[id];
      if (!p) return;
      var row = [
        id,
        p.title || "",
        p.price || 0,
        p.unitLabel || "item",
        p.tag || "",
        p.desc || ""
      ];
      
      var rowStr = row.map(function (val) {
        var stringVal = String(val);
        if (stringVal.indexOf(",") !== -1 || stringVal.indexOf('"') !== -1 || stringVal.indexOf("\n") !== -1) {
          return '"' + stringVal.replace(/"/g, '""') + '"';
        }
        return stringVal;
      }).join(",");
      
      csv.push(rowStr);
    });
    
    downloadCSV(csv.join("\n"), "maahi-inventory-" + new Date().toISOString().slice(0, 10) + ".csv");
  }

  function exportInventoryPDF() {
    var catalog = loadCatalog();
    var keys = Object.keys(catalog);
    if (keys.length === 0) {
      alert("No inventory data to export.");
      return;
    }
    
    var headers = ["Product ID", "Product Title", "Base Price", "Unit Label", "Tag", "Description"];
    var rows = keys.map(function (id) {
      var p = catalog[id];
      return [
        id,
        p.title || "",
        formatMoney(p.price),
        p.unitLabel || "item",
        p.tag || "—",
        p.desc || "—"
      ];
    });
    
    printDataAsPDF("MAAHI PRODUCTS — Inventory Report", headers, rows);
  }

  // --- CLIENT SIDE ROUTING ---
  function initRouter() {
    var navOverview = document.getElementById("nav-overview");
    var navOrders = document.getElementById("nav-orders");
    var navInventory = document.getElementById("nav-inventory");
    var navDatabase = document.getElementById("nav-database");

    var tabOverview = document.getElementById("tab-overview");
    var tabOrders = document.getElementById("tab-orders");
    var tabInventory = document.getElementById("tab-inventory");
    var tabDatabase = document.getElementById("tab-database");

    function handleRoute() {
      var hash = window.location.hash || "#overview";

      if (tabOverview) tabOverview.style.display = "none";
      if (tabOrders) tabOrders.style.display = "none";
      if (tabInventory) tabInventory.style.display = "none";
      if (tabDatabase) tabDatabase.style.display = "none";

      if (navOverview) navOverview.classList.remove("active");
      if (navOrders) navOrders.classList.remove("active");
      if (navInventory) navInventory.classList.remove("active");
      if (navDatabase) navDatabase.classList.remove("active");

      if (hash === "#overview") {
        if (tabOverview) tabOverview.style.display = "block";
        if (navOverview) navOverview.classList.add("active");
        refreshOrdersData();
      } else if (hash === "#orders") {
        if (tabOrders) tabOrders.style.display = "block";
        if (navOrders) navOrders.classList.add("active");
        refreshOrdersData();
      } else if (hash === "#inventory") {
        if (tabInventory) tabInventory.style.display = "block";
        if (navInventory) navInventory.classList.add("active");
        refreshCatalogData();
      } else if (hash === "#database") {
        if (tabDatabase) tabDatabase.style.display = "block";
        if (navDatabase) navDatabase.classList.add("active");
        updateDatabaseUI();
      }
    }

    window.addEventListener("hashchange", handleRoute);

    [navOverview, navOrders, navInventory, navDatabase].forEach(function (el) {
      if (el) {
        el.addEventListener("click", function () {
          var targetHash = el.getAttribute("href");
          if (window.location.hash === targetHash) {
            handleRoute();
          }
        });
      }
    });

    handleRoute();
  }

  // --- DATABASE SETTINGS BINDINGS ---
  var btnDbSave = document.getElementById("btn-db-save");
  var btnDbSync = document.getElementById("btn-db-sync");
  var dbFormError = document.getElementById("db-form-error");
  var dbFormSuccess = document.getElementById("db-form-success");

  if (btnDbSave) {
    btnDbSave.addEventListener("click", function () {
      if (dbFormError) dbFormError.hidden = true;
      if (dbFormSuccess) dbFormSuccess.hidden = true;

      var urlInp = document.getElementById("db-url");
      var keyInp = document.getElementById("db-key");
      var rzpKeyInp = document.getElementById("db-razorpay-key");

      var url = urlInp ? urlInp.value.trim() : "";
      var key = keyInp ? keyInp.value.trim() : "";
      var rzpKey = rzpKeyInp ? rzpKeyInp.value.trim() : "";

      if (!url && !key) {
        localStorage.removeItem("maahi_supabase_url");
        localStorage.removeItem("maahi_supabase_key");
        localStorage.setItem("maahi_razorpay_key", rzpKey);
        
        var oauthCheck = document.getElementById("db-use-real-oauth");
        var useRealOAuth = oauthCheck ? oauthCheck.checked : false;
        localStorage.setItem("maahi_use_real_google_oauth", useRealOAuth ? "true" : "false");
        
        window.maahiSupabase.reinit();
        
        if (dbFormSuccess) {
          dbFormSuccess.textContent = "Settings saved successfully! (Supabase disconnected)";
          dbFormSuccess.hidden = false;
        }
        updateDatabaseUI();
        return;
      }

      if (!url || !key) {
        if (dbFormError) {
          dbFormError.textContent = "Both Project URL and Anon Key are required to connect to Supabase.";
          dbFormError.hidden = false;
        }
        return;
      }

      btnDbSave.disabled = true;
      btnDbSave.textContent = "Testing Connection...";

      window.maahiSupabase.testConnection(url, key).then(function (res) {
        btnDbSave.disabled = false;
        btnDbSave.textContent = "Save & Test Connection";

        if (res.success) {
          localStorage.setItem("maahi_supabase_url", url);
          localStorage.setItem("maahi_supabase_key", key);
          localStorage.setItem("maahi_razorpay_key", rzpKey);
          
          var oauthCheck = document.getElementById("db-use-real-oauth");
          var useRealOAuth = oauthCheck ? oauthCheck.checked : false;
          localStorage.setItem("maahi_use_real_google_oauth", useRealOAuth ? "true" : "false");
          
          window.maahiSupabase.reinit();
          
          if (dbFormSuccess) {
            dbFormSuccess.textContent = res.message || "Connected successfully!";
            dbFormSuccess.hidden = false;
          }
          
          updateDatabaseUI();
        } else {
          if (dbFormError) {
            dbFormError.textContent = "Connection failed: " + res.message;
            dbFormError.hidden = false;
          }
        }
      }).catch(function (err) {
        btnDbSave.disabled = false;
        btnDbSave.textContent = "Save & Test Connection";
        if (dbFormError) {
          dbFormError.textContent = "Error testing connection: " + (err.message || err);
          dbFormError.hidden = false;
        }
      });
    });
  }

  if (btnDbSync) {
    btnDbSync.addEventListener("click", function () {
      if (dbFormError) dbFormError.hidden = true;
      if (dbFormSuccess) dbFormSuccess.hidden = true;

      btnDbSync.disabled = true;
      btnDbSync.textContent = "Syncing...";

      var currentCatalog = loadCatalog();
      window.maahiSupabase.syncLocalCatalog(currentCatalog).then(function () {
        btnDbSync.disabled = false;
        btnDbSync.textContent = "Sync Catalog";
        if (dbFormSuccess) {
          dbFormSuccess.textContent = "Catalog successfully synchronized with Supabase!";
          dbFormSuccess.hidden = false;
        }
      }).catch(function (err) {
        btnDbSync.disabled = false;
        btnDbSync.textContent = "Sync Catalog";
        if (dbFormError) {
          dbFormError.textContent = "Sync failed: " + (err.message || err);
          dbFormError.hidden = false;
        }
      });
    });
  }

  // 10. Toolbar & Bindings Setup
  if (btnExport) {
    btnExport.addEventListener("click", function () {
      var data = loadOrders();
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "maahi-orders-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  var btnExportOrdersExcel = document.getElementById("btn-export-orders-excel");
  if (btnExportOrdersExcel) {
    btnExportOrdersExcel.addEventListener("click", exportOrdersExcel);
  }

  var btnExportOrdersPDF = document.getElementById("btn-export-orders-pdf");
  if (btnExportOrdersPDF) {
    btnExportOrdersPDF.addEventListener("click", exportOrdersPDF);
  }

  var btnExportInvExcel = document.getElementById("btn-export-inv-excel");
  if (btnExportInvExcel) {
    btnExportInvExcel.addEventListener("click", exportInventoryExcel);
  }

  var btnExportInvPDF = document.getElementById("btn-export-inv-pdf");
  if (btnExportInvPDF) {
    btnExportInvPDF.addEventListener("click", exportInventoryPDF);
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", function () {
      sessionStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(PROFILE_KEY);
      
      if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
        window.maahiSupabase.signOut().then(function () {
          window.location.replace("login.html");
        }).catch(function () {
          window.location.replace("login.html");
        });
      } else {
        window.location.replace("login.html");
      }
    });
  }

  if (orderSearch) {
    orderSearch.addEventListener("input", renderTable);
  }
  
  if (statusFilter) {
    statusFilter.addEventListener("change", renderTable);
  }

  if (drawerClose) {
    drawerClose.addEventListener("click", closeDetail);
  }
  
  if (drawerOverlay) {
    drawerOverlay.addEventListener("click", function () {
      closeDetail();
      closeProductDrawer();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (orderDrawer && orderDrawer.classList.contains("is-open")) {
        closeDetail();
      }
      if (productDrawer && productDrawer.classList.contains("is-open")) {
        closeProductDrawer();
      }
    }
  });

  if (btnAddProduct) {
    btnAddProduct.addEventListener("click", function () {
      openProductDrawer();
    });
  }

  if (productClose) {
    productClose.addEventListener("click", closeProductDrawer);
  }

  if (btnCancelProduct) {
    btnCancelProduct.addEventListener("click", closeProductDrawer);
  }

  var fileInp = document.getElementById("prod-image-file");
  var urlInp = document.getElementById("prod-image-url");
  var preview = document.getElementById("prod-image-preview");

  if (fileInp) {
    fileInp.addEventListener("change", function () {
      var file = fileInp.files[0];
      if (file) {
        var reader = new FileReader();
        reader.onload = function (e) {
          currentUploadedBase64 = e.target.result;
          if (preview) {
            preview.style.backgroundImage = "url(" + currentUploadedBase64 + ")";
            preview.textContent = "";
          }
          if (urlInp) urlInp.value = "";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (urlInp) {
    urlInp.addEventListener("input", function () {
      var url = urlInp.value.trim();
      if (url) {
        currentUploadedBase64 = "";
        if (fileInp) fileInp.value = "";
        if (preview) {
          preview.style.backgroundImage = "url(" + url + ")";
          preview.textContent = "";
        }
      } else {
        if (preview) {
          preview.style.backgroundImage = "";
          preview.textContent = "No photo selected";
        }
      }
    });
  }

  if (productForm) {
    productForm.addEventListener("submit", function (e) {
      e.preventDefault();
      
      if (productFormError) {
        productFormError.hidden = true;
        productFormError.textContent = "";
      }
      
      var idField = productForm.elements["id"];
      var isEdit = idField.readOnly;
      var id = idField.value.trim();
      var title = productForm.elements["title"].value.trim();
      var price = parseFloat(productForm.elements["price"].value);
      var unitLabel = productForm.elements["unitLabel"].value.trim();
      var tag = productForm.elements["tag"].value.trim();
      var desc = productForm.elements["desc"].value.trim();
      var featuresText = productForm.elements["features"].value;
      var thumb = productForm.elements["thumb"].value;
      
      // Validation
      if (!id) {
        showProductError("Product ID is required.");
        return;
      }
      if (!isEdit && !/^[a-z0-9\-]+$/.test(id)) {
        showProductError("Product ID must be lowercase letters, numbers, and hyphens only.");
        return;
      }
      if (!title) {
        showProductError("Product title is required.");
        return;
      }
      if (isNaN(price) || price < 0) {
        showProductError("Price must be a valid number greater than or equal to 0.");
        return;
      }
      if (!unitLabel) {
        showProductError("Unit label is required.");
        return;
      }
      
      var catalog = loadCatalog();
      if (!isEdit && catalog[id]) {
        showProductError("A product with ID '" + id + "' already exists.");
        return;
      }
      
      var features = [];
      if (featuresText) {
        features = featuresText.split("\n").map(function (f) { return f.trim(); }).filter(Boolean);
      }
      
      var imageVal = currentUploadedBase64 || productForm.elements["image"].value.trim() || undefined;

      var productObj = {
        title: title,
        price: price,
        unitLabel: unitLabel,
        thumb: thumb || undefined,
        image: imageVal,
        tag: tag || undefined,
        desc: desc || undefined,
        features: features.length > 0 ? features : undefined
      };

      catalog[id] = productObj;
      saveCatalog(catalog);

      if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
        var saveBtn = document.getElementById("btn-save-product");
        var cancelBtn = document.getElementById("btn-cancel-product");
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
        }
        if (cancelBtn) cancelBtn.disabled = true;

        window.maahiSupabase.saveProduct(id, productObj).then(function () {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Product";
          }
          if (cancelBtn) cancelBtn.disabled = false;
          closeProductDrawer();
          renderInventoryTable();
        }).catch(function (err) {
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Product";
          }
          if (cancelBtn) cancelBtn.disabled = false;
          showProductError("Failed to save to Supabase: " + (err.message || err));
        });
      } else {
        closeProductDrawer();
        renderInventoryTable();
      }
    });
  }

  // Re-draw chart on window resize to keep it perfectly responsive
  var resizeTimeout;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      var tabOverview = document.getElementById("tab-overview");
      if (tabOverview && tabOverview.style.display !== "none") {
        var filtered = getFilteredOrders();
        renderSVGChart(filtered);
      }
    }, 200);
  });

  // Listen for Supabase Auth state changes for owner dashboard
  if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
    // Check initial session
    window.maahiSupabase.getSession().then(function (res) {
      var session = res.data ? res.data.session : null;
      if (session && session.user) {
        var email = session.user.email;
        var role = "Contractor";
        if (email.toLowerCase().indexOf("admin") !== -1 || email.toLowerCase().indexOf("owner") !== -1) {
          role = "Administrator";
        }
        var profile = {
          name: session.user.user_metadata.full_name || email.split("@")[0],
          role: role,
          email: email
        };
        sessionStorage.setItem(AUTH_KEY, session.access_token);
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        updateProfileUI(profile);
      }
    }).catch(function (err) {
      console.warn("Failed to check Supabase session in dashboard load:", err);
    });

    window.maahiSupabase.onAuthStateChange(function (event, session) {
      if (session && session.user) {
        var email = session.user.email;
        var role = "Contractor";
        if (email.toLowerCase().indexOf("admin") !== -1 || email.toLowerCase().indexOf("owner") !== -1) {
          role = "Administrator";
        }
        var profile = {
          name: session.user.user_metadata.full_name || email.split("@")[0],
          role: role,
          email: email
        };
        sessionStorage.setItem(AUTH_KEY, session.access_token);
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        updateProfileUI(profile);
      } else if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(PROFILE_KEY);
        localStorage.removeItem(PROFILE_KEY);
        window.location.replace("login.html");
      }
    });
  }

  // Initial load
  refreshCatalogData();
  initRouter();
  window.maahiDashInitialized = true;
})();
