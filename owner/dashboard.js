(function () {
  var ORDERS_KEY = "glc_orders_v1";
  var AUTH_KEY = "maahi_owner_auth_token";
  var CATALOG_KEY = "glc_catalog_v1";
  var PROFILE_KEY = "maahi_user_profile";
  var DELETED_ORDERS_KEY = "maahi_deleted_order_ids_v1";

  function getDeletedOrderIds() {
    try {
      var raw = localStorage.getItem(DELETED_ORDERS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveDeletedOrderIds(map) {
    try {
      localStorage.setItem(DELETED_ORDERS_KEY, JSON.stringify(map || {}));
    } catch (e) {}
  }

  function markOrderAsDeleted(orderId) {
    if (!orderId) return;
    var map = getDeletedOrderIds();
    map[orderId] = true;
    saveDeletedOrderIds(map);
  }

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
    renderRecentOrders();
    renderQuotesTable();

    if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
      window.maahiSupabase.fetchOrders().then(function (dbOrders) {
        if (dbOrders && Array.isArray(dbOrders)) {
          var deletedMap = getDeletedOrderIds();
          var localOrders = loadOrders();
          var mergedMap = {};
          
          localOrders.forEach(function (o) {
            if (o && o.id && !deletedMap[o.id]) {
              mergedMap[o.id] = o;
            }
          });
          
          dbOrders.forEach(function (o) {
            if (o && o.id) {
              if (deletedMap[o.id]) {
                // If it was previously marked as deleted, ensure it is purged in Supabase
                window.maahiSupabase.deleteOrder(o.id).catch(function () {});
              } else {
                mergedMap[o.id] = o;
              }
            }
          });
          
          var mergedList = Object.values(mergedMap).sort(function (a, b) {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          });
          
          saveOrders(mergedList);
          renderTable();
          renderRecentOrders();
          renderQuotesTable();
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
      if (!window.maahiSupabase.hasChecked()) {
        if (indicator) indicator.style.backgroundColor = "#eab308";
        if (label) label.textContent = "Connecting...";
        if (desc) desc.textContent = "Checking connection health...";
        if (syncBtn) syncBtn.disabled = true;
        setTimeout(updateDatabaseUI, 500);
      } else if (window.maahiSupabase.isHealthy()) {
        if (indicator) indicator.style.backgroundColor = "#067d17";
        if (label) label.textContent = "Connected";
        if (desc) desc.textContent = "Successfully connected to your Supabase project.";
        if (syncBtn) syncBtn.disabled = false;
      } else {
        if (indicator) indicator.style.backgroundColor = "#ef4444";
        if (label) label.textContent = "Error";
        if (desc) desc.textContent = "Unreachable or invalid Supabase project URL/Key.";
        if (syncBtn) syncBtn.disabled = true;
      }
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
    window.location.replace("../login.html?role=admin");
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

  // Invoice Drawer Elements
  var invoiceDrawer = document.getElementById("invoice-drawer");
  var invoiceClose = document.getElementById("invoice-close");
  var invoiceForm = document.getElementById("invoice-form");
  var btnCreateInvoiceOverview = document.getElementById("btn-create-invoice-overview");
  var btnCreateInvoiceOrders = document.getElementById("btn-create-invoice-orders");
  var btnInvAddRow = document.getElementById("btn-inv-add-row");
  var btnCancelInvoice = document.getElementById("btn-cancel-invoice");
  var invItemsTbody = document.getElementById("inv-items-tbody");
  var invoiceFormError = document.getElementById("invoice-form-error");

  // 4. Data Layer Functions
  function loadOrders() {
    try {
      var deletedMap = getDeletedOrderIds();
      var raw = localStorage.getItem(ORDERS_KEY);
      var data = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(data)) data = [];
      var active = data.filter(function (o) {
        return o && o.id && !deletedMap[o.id];
      });
      if (active.length !== data.length) {
        localStorage.setItem(ORDERS_KEY, JSON.stringify(active));
      }
      return active;
    } catch (e) {
      return [];
    }
  }

  function saveOrders(orders) {
    var deletedMap = getDeletedOrderIds();
    var clean = (orders || []).filter(function (o) {
      return o && o.id && !deletedMap[o.id];
    });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(clean));
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
      if (!o) return false;
      var orderStatus = (o.status || "new").toLowerCase();
      if (st && orderStatus !== st.toLowerCase()) return false;
      if (!q) return true;
      var blob =
        (o.id || "") +
        " " +
        (o.customer && o.customer.name) +
        " " +
        (o.customer && o.customer.email) +
        " " +
        (o.customer && o.customer.fulfillment) +
        " " +
        (o.customer && o.customer.delivery_partner) +
        " " +
        (o.customer && o.customer.tracking_id);
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

  function updateOrderTracking(orderId, trackingData) {
    return new Promise(function (resolve, reject) {
      var orders = loadOrders();
      var changedOrder = null;
      orders.forEach(function (o) {
        if (o.id === orderId) {
          if (!o.customer) o.customer = {};
          o.customer.delivery_partner = trackingData.delivery_partner || "";
          o.customer.tracking_id = trackingData.tracking_id || "";
          o.customer.tracking_url = trackingData.tracking_url || "";
          o.statusUpdatedAt = new Date().toISOString();
          changedOrder = o;
        }
      });

      if (!changedOrder) {
        reject(new Error("Order not found"));
        return;
      }

      saveOrders(orders);

      if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
        window.maahiSupabase.updateOrder(orderId, {
          customer: changedOrder.customer
        }).then(function () {
          resolve(true);
        }).catch(function (err) {
          console.warn("Supabase updateOrder failed, updated locally:", err);
          resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  }

  // Number to words converter for Tax Invoices
  function numberToWords(num) {
    var a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    var b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    var n = ('000000000' + Math.round(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    var str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return (str.trim() ? 'Rupees ' + str.trim() + ' Only' : 'Rupees Zero Only');
  }

  // Printable Tax Invoice Generator
  function printInvoice(order) {
    if (!order) return;
    var c = order.customer || {};
    var lines = order.lines || [];
    
    var subtotal = order.subtotal || 0;
    var discount = Number(c.discount) || 0;
    var taxableSubtotal = Math.max(0, subtotal - discount);
    var taxRate = Number(c.tax_rate) || 0;
    var taxAmount = Math.round((taxableSubtotal * taxRate) / 100);
    var shipping = Number(c.shipping) || 0;
    var grandTotal = taxableSubtotal + taxAmount + shipping;

    var cgstRate = (taxRate / 2).toFixed(1);
    var sgstRate = (taxRate / 2).toFixed(1);
    var cgstAmount = Math.round(taxAmount / 2);
    var sgstAmount = taxAmount - cgstAmount;

    var invoiceNum = order.id.startsWith("INV-") ? order.id : "INV-" + order.id.replace("GLC-", "");
    var invoiceDate = formatDate(order.createdAt).split(",")[0] || new Date().toLocaleDateString();
    var dueDate = c.target_date || c.targetDate || "Immediate / On Dispatch";
    var status = (order.status || "new").toUpperCase();
    var isPaid = status === "PAID";
    var paymentMethod = (c.payment_method || (c.razorpay_payment_id ? "Razorpay Online" : "Bank Wire / NEFT")).toUpperCase();

    var printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups in your browser to view and print the invoice.");
      return;
    }

    var html = '<!DOCTYPE html><html><head><meta charset="utf-8">';
    html += '<title>Tax Invoice — ' + escapeHtml(invoiceNum) + '</title>';
    html += '<style>';
    html += '@page { size: A4; margin: 12mm; }';
    html += 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c2b24; margin: 0; padding: 20px; font-size: 13px; line-height: 1.45; background: #fff; }';
    html += '.invoice-container { max-width: 820px; margin: 0 auto; border: 1px solid #c8d8ce; padding: 25px; border-radius: 8px; box-sizing: border-box; }';
    html += '.header-table { width: 100%; border-bottom: 2px solid #2d6a4f; padding-bottom: 12px; margin-bottom: 18px; }';
    html += '.brand-name { font-size: 24px; font-weight: 800; color: #2d6a4f; letter-spacing: 0.5px; text-transform: uppercase; }';
    html += '.brand-tagline { font-size: 11px; color: #40916c; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }';
    html += '.company-details { font-size: 11px; color: #555; line-height: 1.4; text-align: right; }';
    html += '.invoice-title-bar { display: flex; justify-content: space-between; align-items: center; background: #f2f7f4; border: 1px solid #d8e6dc; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; }';
    html += '.invoice-title { font-size: 17px; font-weight: 800; color: #1c2b24; text-transform: uppercase; }';
    html += '.status-tag { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; }';
    html += '.status-paid { background: #e8f5e9; color: #166534; border: 1px solid #bbf7d0; }';
    html += '.status-unpaid { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }';
    html += '.two-col-grid { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 18px; }';
    html += '.meta-card { flex: 1; background: #fafcfb; border: 1px solid #e0ebe3; border-radius: 6px; padding: 12px 14px; font-size: 12px; }';
    html += '.meta-card h4 { margin: 0 0 8px 0; font-size: 11px; color: #2d6a4f; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #d8e6dc; padding-bottom: 4px; }';
    html += '.meta-row { display: flex; justify-content: space-between; margin-bottom: 3px; }';
    html += '.meta-label { color: #666; }';
    html += '.meta-val { font-weight: 700; color: #1c2b24; }';
    html += '.items-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12px; }';
    html += '.items-table th { background: #2d6a4f; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; font-weight: 700; }';
    html += '.items-table td { padding: 8px 10px; border-bottom: 1px solid #e0ebe3; }';
    html += '.items-table tr:nth-child(even) td { background: #fafcfb; }';
    html += '.words-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 8px 12px; font-size: 11px; font-weight: 700; color: #166534; margin-bottom: 18px; }';
    html += '.summary-grid { display: flex; justify-content: space-between; gap: 18px; margin-bottom: 20px; }';
    html += '.bank-details { flex: 1.2; font-size: 11px; color: #444; border: 1px dashed #2d6a4f; padding: 12px; border-radius: 6px; background: #fafcfb; line-height: 1.45; }';
    html += '.bank-details strong { color: #2d6a4f; }';
    html += '.calc-table { flex: 0.9; width: 100%; font-size: 12px; }';
    html += '.calc-table td { padding: 3px 6px; }';
    html += '.calc-table .grand-total td { font-size: 15px; font-weight: 800; color: #2d6a4f; border-top: 2px solid #2d6a4f; border-bottom: 2px solid #2d6a4f; padding: 6px 6px; }';
    html += '.footer-table { width: 100%; margin-top: 20px; border-top: 1px solid #e0ebe3; padding-top: 14px; font-size: 11px; color: #666; }';
    html += '.signatory-box { text-align: right; }';
    html += '.sign-line { display: inline-block; width: 160px; border-top: 1px solid #333; margin-top: 35px; }';
    html += '@media print { body { padding: 0; background: none; } .invoice-container { border: none; padding: 0; } .no-print { display: none; } }';
    html += '</style></head><body>';

    html += '<div class="no-print" style="max-width:820px; margin:0 auto 12px; text-align:right;">';
    html += '  <button onclick="window.print()" style="background:#2d6a4f; color:#fff; border:none; padding:8px 18px; border-radius:6px; font-weight:700; font-size:13px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.15);">🖨️ Print / Download PDF</button>';
    html += '  <button onclick="window.close()" style="background:#f3f4f6; color:#374151; border:1px solid #d1d5db; padding:8px 14px; border-radius:6px; font-weight:600; font-size:13px; cursor:pointer; margin-left:8px;">Close</button>';
    html += '</div>';

    html += '<div class="invoice-container">';

    // Header Table
    html += '  <table class="header-table">';
    html += '    <tr>';
    html += '      <td style="vertical-align: top;">';
    html += '        <div class="brand-name">MAAHI COCOPEAT AND COIR PRODUCTS</div>';
    html += '        <div class="brand-tagline">Sustainable Cocopeat &amp; Coir Media</div>';
    html += '        <div style="font-size:11px; color:#555; margin-top:4px;">GSTIN: <strong>33AACFM1234F1Z9</strong> (Registered)</div>';
    html += '      </td>';
    html += '      <td class="company-details">';
    html += '        <strong>MAAHI ENTERPRISES</strong><br>';
    html += '        Premium Cocopeat Manufacturing &amp; Supply<br>';
    html += '        Coimbatore / Tirupur Hub, Tamil Nadu — India<br>';
    html += '        Email: Maahienterprises6468@gmail.com | Phone: +91 94801 82959<br>';
    html += '        Web: maahienterprises.in';
    html += '      </td>';
    html += '    </tr>';
    html += '  </table>';

    // Title Bar
    html += '  <div class="invoice-title-bar">';
    html += '    <div>';
    html += '      <span class="invoice-title">TAX INVOICE</span>';
    html += '      <span style="font-size:12px; color:#666; margin-left:8px;"># ' + escapeHtml(invoiceNum) + '</span>';
    html += '    </div>';
    html += '    <div>';
    html += '      <span class="status-tag ' + (isPaid ? 'status-paid' : 'status-unpaid') + '">' + (isPaid ? '✓ PAID' : 'PENDING PAYMENT') + '</span>';
    html += '    </div>';
    html += '  </div>';

    // 2-Column Meta & Customer Grid
    html += '  <div class="two-col-grid">';
    
    // Billed To
    html += '    <div class="meta-card">';
    html += '      <h4>Billed &amp; Shipped To</h4>';
    if (c.company_name || order.company_name) {
      html += '      <div style="font-size:14px; font-weight:800; color:#2d6a4f; margin-bottom:2px;">' + escapeHtml(c.company_name || order.company_name) + '</div>';
    }
    html += '      <div style="font-size:13px; font-weight:700; color:#1c2b24; margin-bottom:2px;">' + escapeHtml(c.name || "Customer") + '</div>';
    if (c.phone) html += '      <div>Phone: ' + escapeHtml(c.phone) + '</div>';
    if (c.email) html += '      <div>Email: ' + escapeHtml(c.email) + '</div>';
    if (c.gstin || order.gstin) html += '      <div style="margin-top:3px;">GSTIN: <strong style="font-family:monospace; background:#e8f5e9; color:#166534; padding:1px 5px; border-radius:3px; border:1px solid #bbf7d0;">' + escapeHtml(c.gstin || order.gstin) + '</strong> <span style="font-size:10px; color:#166534; font-weight:700;">(B2B Verified)</span></div>';
    if (c.address) {
      html += '      <div style="margin-top:4px; color:#444; line-height:1.35;">' + escapeHtml(c.address).replace(/\n/g, "<br>") + '</div>';
    }
    html += '    </div>';

    // Invoice Meta
    html += '    <div class="meta-card">';
    html += '      <h4>Invoice Information</h4>';
    html += '      <div class="meta-row"><span class="meta-label">Invoice Number:</span><span class="meta-val">' + escapeHtml(invoiceNum) + '</span></div>';
    html += '      <div class="meta-row"><span class="meta-label">Invoice Date:</span><span class="meta-val">' + escapeHtml(invoiceDate) + '</span></div>';
    html += '      <div class="meta-row"><span class="meta-label">Delivery Due Date:</span><span class="meta-val">' + escapeHtml(dueDate) + '</span></div>';
    html += '      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">' + escapeHtml(paymentMethod) + '</span></div>';
    if (c.razorpay_payment_id) {
      html += '      <div class="meta-row"><span class="meta-label">Razorpay Ref:</span><span class="meta-val" style="font-family:monospace;">' + escapeHtml(c.razorpay_payment_id) + '</span></div>';
    }
    if (c.delivery_partner || c.tracking_id) {
      html += '      <div class="meta-row"><span class="meta-label">Courier Tracking:</span><span class="meta-val">' + escapeHtml((c.delivery_partner || "Courier") + ": " + (c.tracking_id || "Dispatched")) + '</span></div>';
    }
    html += '    </div>';
    html += '  </div>';

    // Items Table
    html += '  <table class="items-table">';
    html += '    <thead>';
    html += '      <tr>';
    html += '        <th style="width:5%;">#</th>';
    html += '        <th style="width:45%;">Item Description</th>';
    html += '        <th style="width:14%; text-align:right;">Rate (₹)</th>';
    html += '        <th style="width:10%; text-align:center;">Qty</th>';
    html += '        <th style="width:13%; text-align:right;">Taxable (₹)</th>';
    html += '        <th style="width:13%; text-align:right;">Amount (₹)</th>';
    html += '      </tr>';
    html += '    </thead>';
    html += '    <tbody>';

    lines.forEach(function (l, idx) {
      var itemPrice = Number(l.unitPrice || l.price) || 0;
      var itemQty = Number(l.qty || l.quantity) || 1;
      var itemTotal = l.lineTotal != null ? Number(l.lineTotal) : (itemPrice * itemQty);
      var bulkTag = l.discountPercent > 0 ? ' <span style="font-size:10px; font-weight:700; color:#166534; background:#dcfce7; padding:1px 5px; border-radius:3px; border:1px solid #86efac;">' + l.discountPercent + '% BULK OFF</span>' : '';

      html += '      <tr>';
      html += '        <td>' + (idx + 1) + '</td>';
      html += '        <td><strong>' + escapeHtml(l.title || l.name || l.id) + '</strong>' + bulkTag + '</td>';
      html += '        <td style="text-align:right;">₹' + itemPrice.toLocaleString("en-IN") + '</td>';
      html += '        <td style="text-align:center;">' + itemQty + '</td>';
      html += '        <td style="text-align:right;">₹' + itemTotal.toLocaleString("en-IN") + '</td>';
      html += '        <td style="text-align:right; font-weight:700;">₹' + itemTotal.toLocaleString("en-IN") + '</td>';
      html += '      </tr>';
    });

    html += '    </tbody>';
    html += '  </table>';

    // Amount in Words
    html += '  <div class="words-banner">';
    html += '    <strong>Amount in Words:</strong> ' + escapeHtml(numberToWords(grandTotal));
    html += '  </div>';

    // Summary & Bank Details Grid
    html += '  <div class="summary-grid">';
    
    // Bank Instructions
    html += '    <div class="bank-details">';
    html += '      <strong>Bank Account Details for Wire / NEFT Transfer:</strong><br>';
    html += '      Bank Name: <strong>State Bank of India</strong><br>';
    html += '      Account Name: <strong>MAAHI ENTERPRISES</strong><br>';
    html += '      Account No: <strong>41289056214</strong><br>';
    html += '      IFSC Code: <strong>SBIN0001234</strong><br>';
    html += '      UPI ID: <strong>maahi.enterprises@sbi</strong>';
    if (c.notes) {
      html += '      <div style="margin-top:8px; padding-top:6px; border-top:1px dashed #d0ded6;">';
      html += '        <strong>Terms / Notes:</strong> ' + escapeHtml(c.notes);
      html += '      </div>';
    }
    html += '    </div>';

    // Calculations
    html += '    <div>';
    html += '      <table class="calc-table">';
    html += '        <tr><td>Items Subtotal:</td><td style="text-align:right; font-weight:600;">₹' + subtotal.toLocaleString("en-IN") + '</td></tr>';
    if (discount > 0) {
      html += '        <tr><td>Discount:</td><td style="text-align:right; color:#b91c1c;">-₹' + discount.toLocaleString("en-IN") + '</td></tr>';
    }
    if (taxRate > 0) {
      html += '        <tr><td>CGST (' + cgstRate + '%):</td><td style="text-align:right;">₹' + cgstAmount.toLocaleString("en-IN") + '</td></tr>';
      html += '        <tr><td>SGST (' + sgstRate + '%):</td><td style="text-align:right;">₹' + sgstAmount.toLocaleString("en-IN") + '</td></tr>';
    } else {
      html += '        <tr><td>GST Tax:</td><td style="text-align:right; color:#666;">Exempt (0%)</td></tr>';
    }
    if (shipping > 0) {
      html += '        <tr><td>Shipping / Handling:</td><td style="text-align:right;">₹' + shipping.toLocaleString("en-IN") + '</td></tr>';
    }
    html += '        <tr class="grand-total"><td>Total Payable:</td><td style="text-align:right;">₹' + grandTotal.toLocaleString("en-IN") + '</td></tr>';
    html += '      </table>';
    html += '    </div>';
    html += '  </div>';

    // Footer Table
    html += '  <table class="footer-table">';
    html += '    <tr>';
    html += '      <td style="vertical-align: bottom;">';
    html += '        <strong>Terms &amp; Conditions:</strong><br>';
    html += '        1. 100% natural, washed and sterilized organic growth media.<br>';
    html += '        2. Dispatched goods are covered under agricultural export standards.<br>';
    html += '        3. Subject to Coimbatore jurisdiction.';
    html += '      </td>';
    html += '      <td class="signatory-box" style="vertical-align: bottom;">';
    html += '        <strong>For MAAHI ENTERPRISES</strong><br>';
    html += '        <div class="sign-line"></div><br>';
    html += '        <span>Authorized Signatory</span>';
    html += '      </td>';
    html += '    </tr>';
    html += '  </table>';

    html += '</div>';

    html += '<script>';
    html += 'window.onload = function() { setTimeout(function() { window.print(); }, 400); };';
    html += '</script>';

    html += '</body></html>';

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  // --- INVOICE DRAWER CONTROLLER ---

  function showInvoiceError(msg) {
    if (!invoiceFormError) return;
    invoiceFormError.textContent = msg;
    invoiceFormError.hidden = false;
  }

  function hideInvoiceError() {
    if (!invoiceFormError) return;
    invoiceFormError.textContent = "";
    invoiceFormError.hidden = true;
  }

  function addInvoiceItemRow(item) {
    if (!invItemsTbody) return;
    item = item || {};
    var catalog = loadCatalog();
    var catKeys = Object.keys(catalog);

    var tr = document.createElement("tr");

    var tdTitle = document.createElement("td");
    var selectTitle = document.createElement("select");
    selectTitle.className = "inv-item-select";
    selectTitle.style.marginBottom = "4px";

    var defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "— Select Catalog Product —";
    selectTitle.appendChild(defaultOpt);

    catKeys.forEach(function (k) {
      var prod = catalog[k];
      var opt = document.createElement("option");
      opt.value = k;
      opt.textContent = (prod.title || k) + " (₹" + (prod.price || 0) + ")";
      if (item.id === k || (item.title && prod.title && item.title.toLowerCase() === prod.title.toLowerCase())) {
        opt.selected = true;
      }
      selectTitle.appendChild(opt);
    });

    var customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "Custom Item / Service";
    selectTitle.appendChild(customOpt);

    var titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "inv-item-title";
    titleInput.placeholder = "Item title / description";
    titleInput.value = item.title || "";
    titleInput.required = true;

    tdTitle.appendChild(selectTitle);
    tdTitle.appendChild(titleInput);

    var tdPrice = document.createElement("td");
    var priceInput = document.createElement("input");
    priceInput.type = "number";
    priceInput.className = "inv-item-price";
    priceInput.min = "0";
    priceInput.value = item.unitPrice != null ? item.unitPrice : (item.price != null ? item.price : 0);
    priceInput.style.textAlign = "right";
    tdPrice.appendChild(priceInput);

    var tdQty = document.createElement("td");
    var qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.className = "inv-item-qty";
    qtyInput.min = "1";
    qtyInput.value = item.qty || item.quantity || 1;
    qtyInput.style.textAlign = "center";
    tdQty.appendChild(qtyInput);

    var tdTotal = document.createElement("td");
    tdTotal.className = "inv-item-total";
    tdTotal.style.textAlign = "right";
    tdTotal.style.fontWeight = "700";
    tdTotal.style.color = "var(--gold)";
    tdTotal.textContent = "₹0";

    var tdRemove = document.createElement("td");
    tdRemove.style.textAlign = "center";
    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-remove-row";
    removeBtn.innerHTML = "×";
    removeBtn.title = "Remove item";
    removeBtn.addEventListener("click", function () {
      tr.remove();
      calcInvoiceTotals();
    });
    tdRemove.appendChild(removeBtn);

    selectTitle.addEventListener("change", function () {
      var selVal = selectTitle.value;
      if (selVal && selVal !== "custom" && catalog[selVal]) {
        titleInput.value = catalog[selVal].title;
        priceInput.value = catalog[selVal].price || 0;
      }
      calcInvoiceTotals();
    });

    titleInput.addEventListener("input", calcInvoiceTotals);
    priceInput.addEventListener("input", calcInvoiceTotals);
    qtyInput.addEventListener("input", calcInvoiceTotals);

    tr.appendChild(tdTitle);
    tr.appendChild(tdPrice);
    tr.appendChild(tdQty);
    tr.appendChild(tdTotal);
    tr.appendChild(tdRemove);

    invItemsTbody.appendChild(tr);
    calcInvoiceTotals();
  }

  function calcInvoiceTotals() {
    if (!invItemsTbody) return;
    var rows = invItemsTbody.querySelectorAll("tr");
    var subtotal = 0;

    rows.forEach(function (tr) {
      var priceInput = tr.querySelector(".inv-item-price");
      var qtyInput = tr.querySelector(".inv-item-qty");
      var totalCell = tr.querySelector(".inv-item-total");
      if (!priceInput || !qtyInput || !totalCell) return;

      var p = Number(priceInput.value) || 0;
      var q = Number(qtyInput.value) || 1;
      var rowTotal = p * q;
      subtotal += rowTotal;
      totalCell.textContent = "₹" + rowTotal.toLocaleString("en-IN");
    });

    var taxRateEl = document.getElementById("inv-tax-rate");
    var discountEl = document.getElementById("inv-discount");
    var shippingEl = document.getElementById("inv-shipping");

    var taxRate = taxRateEl ? Number(taxRateEl.value) || 0 : 0;
    var discount = discountEl ? Number(discountEl.value) || 0 : 0;
    var shipping = shippingEl ? Number(shippingEl.value) || 0 : 0;

    var taxable = Math.max(0, subtotal - discount);
    var taxAmount = Math.round((taxable * taxRate) / 100);
    var grandTotal = taxable + taxAmount + shipping;

    var calcSubtotal = document.getElementById("inv-calc-subtotal");
    var calcDiscount = document.getElementById("inv-calc-discount");
    var calcTax = document.getElementById("inv-calc-tax");
    var calcShipping = document.getElementById("inv-calc-shipping");
    var calcGrandTotal = document.getElementById("inv-calc-grand-total");

    var rowDiscount = document.getElementById("inv-row-discount");
    var rowTax = document.getElementById("inv-row-tax");
    var rowShipping = document.getElementById("inv-row-shipping");

    if (calcSubtotal) calcSubtotal.textContent = "₹" + subtotal.toLocaleString("en-IN");
    if (calcDiscount) calcDiscount.textContent = "-₹" + discount.toLocaleString("en-IN");
    if (calcTax) calcTax.textContent = "₹" + taxAmount.toLocaleString("en-IN") + (taxRate > 0 ? " (" + taxRate + "%)" : "");
    if (calcShipping) calcShipping.textContent = "₹" + shipping.toLocaleString("en-IN");
    if (calcGrandTotal) calcGrandTotal.textContent = "₹" + grandTotal.toLocaleString("en-IN");

    if (rowDiscount) rowDiscount.style.display = discount > 0 ? "flex" : "none";
    if (rowTax) rowTax.style.display = taxRate > 0 ? "flex" : "none";
    if (rowShipping) rowShipping.style.display = shipping > 0 ? "flex" : "none";
  }

  function openInvoiceDrawer(orderToEdit) {
    if (!invoiceDrawer || !drawerOverlay) return;
    hideInvoiceError();

    var titleEl = document.getElementById("invoice-drawer-title");
    var badgeEl = document.getElementById("invoice-badge-status");

    if (invItemsTbody) invItemsTbody.innerHTML = "";

    if (orderToEdit) {
      if (titleEl) titleEl.textContent = "Edit Invoice — " + orderToEdit.id;
      if (badgeEl) {
        badgeEl.textContent = (orderToEdit.status || "new").toUpperCase();
        badgeEl.className = "status-pill status-" + (orderToEdit.status || "new");
      }

      var c = orderToEdit.customer || {};
      document.getElementById("inv-id").value = orderToEdit.id || "";
      document.getElementById("inv-id").readOnly = true;
      document.getElementById("inv-date").value = orderToEdit.createdAt ? orderToEdit.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      document.getElementById("inv-due-date").value = c.target_date || "";
      document.getElementById("inv-cust-name").value = c.name || "";
      document.getElementById("inv-cust-phone").value = c.phone || "";
      document.getElementById("inv-cust-email").value = c.email || "";
      document.getElementById("inv-cust-gstin").value = c.gstin || "";
      document.getElementById("inv-cust-address").value = c.address || "";
      document.getElementById("inv-status").value = orderToEdit.status || "new";
      document.getElementById("inv-payment-method").value = c.payment_method || (c.razorpay_payment_id ? "razorpay" : "bank_transfer");
      document.getElementById("inv-fulfillment").value = c.fulfillment || "ship";
      document.getElementById("inv-tax-rate").value = c.tax_rate != null ? c.tax_rate : "0";
      document.getElementById("inv-discount").value = c.discount || 0;
      document.getElementById("inv-shipping").value = c.shipping || 0;
      document.getElementById("inv-delivery-partner").value = c.delivery_partner || "";
      document.getElementById("inv-tracking-id").value = c.tracking_id || "";
      document.getElementById("inv-notes").value = c.notes || "";

      var lines = orderToEdit.lines || [];
      if (lines.length > 0) {
        lines.forEach(function (l) {
          addInvoiceItemRow(l);
        });
      } else {
        addInvoiceItemRow();
      }
    } else {
      if (titleEl) titleEl.textContent = "Create Tax Invoice";
      if (badgeEl) {
        badgeEl.textContent = "DRAFT";
        badgeEl.className = "status-pill status-new";
      }

      var randId = "INV-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
      document.getElementById("inv-id").value = randId;
      document.getElementById("inv-id").readOnly = false;
      document.getElementById("inv-date").value = new Date().toISOString().slice(0, 10);
      document.getElementById("inv-due-date").value = "";
      document.getElementById("inv-cust-name").value = "";
      document.getElementById("inv-cust-phone").value = "";
      document.getElementById("inv-cust-email").value = "";
      document.getElementById("inv-cust-gstin").value = "";
      document.getElementById("inv-cust-address").value = "";
      document.getElementById("inv-status").value = "new";
      document.getElementById("inv-payment-method").value = "bank_transfer";
      document.getElementById("inv-fulfillment").value = "ship";
      document.getElementById("inv-tax-rate").value = "0";
      document.getElementById("inv-discount").value = "0";
      document.getElementById("inv-shipping").value = "0";
      document.getElementById("inv-delivery-partner").value = "";
      document.getElementById("inv-tracking-id").value = "";
      document.getElementById("inv-notes").value = "";

      addInvoiceItemRow();
    }

    calcInvoiceTotals();

    invoiceDrawer.style.display = "flex";
    setTimeout(function () {
      invoiceDrawer.classList.add("is-open");
      invoiceDrawer.setAttribute("aria-hidden", "false");
      drawerOverlay.classList.add("is-visible");
      drawerOverlay.setAttribute("aria-hidden", "false");
    }, 10);
  }

  function closeInvoiceDrawer() {
    if (invoiceDrawer) {
      invoiceDrawer.classList.remove("is-open");
      invoiceDrawer.setAttribute("aria-hidden", "true");
      setTimeout(function () {
        invoiceDrawer.style.display = "none";
      }, 350);
    }
    if (drawerOverlay) {
      drawerOverlay.classList.remove("is-visible");
      drawerOverlay.setAttribute("aria-hidden", "true");
    }
    hideInvoiceError();
  }

  function handleInvoiceFormSubmit(e) {
    if (e) e.preventDefault();
    hideInvoiceError();

    var invId = document.getElementById("inv-id").value.trim();
    var invDate = document.getElementById("inv-date").value;
    var invTargetDate = document.getElementById("inv-due-date").value;
    var custName = document.getElementById("inv-cust-name").value.trim();
    var custPhone = document.getElementById("inv-cust-phone").value.trim();
    var custEmail = document.getElementById("inv-cust-email").value.trim();
    var custGstin = document.getElementById("inv-cust-gstin").value.trim();
    var custAddress = document.getElementById("inv-cust-address").value.trim();
    var invStatus = document.getElementById("inv-status").value;
    var invPaymentMethod = document.getElementById("inv-payment-method").value;
    var invFulfillment = document.getElementById("inv-fulfillment").value;
    var invTaxRate = Number(document.getElementById("inv-tax-rate").value) || 0;
    var invDiscount = Number(document.getElementById("inv-discount").value) || 0;
    var invShipping = Number(document.getElementById("inv-shipping").value) || 0;
    var invDeliveryPartner = document.getElementById("inv-delivery-partner").value.trim();
    var invTrackingId = document.getElementById("inv-tracking-id").value.trim();
    var invNotes = document.getElementById("inv-notes").value.trim();

    if (!invId) {
      showInvoiceError("Please enter an Invoice / Order ID.");
      return;
    }
    if (!custName) {
      showInvoiceError("Please enter Customer / Company Name.");
      return;
    }

    var rowEls = invItemsTbody ? invItemsTbody.querySelectorAll("tr") : [];
    var lines = [];
    var itemsSubtotal = 0;

    rowEls.forEach(function (tr) {
      var titleInput = tr.querySelector(".inv-item-title");
      var priceInput = tr.querySelector(".inv-item-price");
      var qtyInput = tr.querySelector(".inv-item-qty");
      if (!titleInput || !priceInput || !qtyInput) return;

      var title = titleInput.value.trim();
      var price = Number(priceInput.value) || 0;
      var qty = Number(qtyInput.value) || 1;
      if (!title) return;

      var total = price * qty;
      itemsSubtotal += total;
      lines.push({
        id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title: title,
        unitPrice: price,
        qty: qty,
        lineTotal: total
      });
    });

    if (lines.length === 0) {
      showInvoiceError("Please add at least one line item with a title and price.");
      return;
    }

    var taxableSubtotal = Math.max(0, itemsSubtotal - invDiscount);
    var taxAmount = Math.round((taxableSubtotal * invTaxRate) / 100);
    var grandTotal = taxableSubtotal + taxAmount + invShipping;

    var orderPayload = {
      id: invId,
      createdAt: invDate ? new Date(invDate).toISOString() : new Date().toISOString(),
      status: invStatus,
      subtotal: grandTotal,
      lines: lines,
      customer: {
        name: custName,
        phone: custPhone,
        email: custEmail,
        gstin: custGstin,
        address: custAddress,
        fulfillment: invFulfillment,
        payment_method: invPaymentMethod,
        target_date: invTargetDate,
        tax_rate: invTaxRate,
        tax_amount: taxAmount,
        discount: invDiscount,
        shipping: invShipping,
        delivery_partner: invDeliveryPartner,
        tracking_id: invTrackingId,
        notes: invNotes,
        is_manual_invoice: true
      }
    };

    var orders = loadOrders();
    var existingIdx = -1;
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].id === invId) {
        existingIdx = i;
        break;
      }
    }

    if (existingIdx !== -1) {
      orders[existingIdx] = orderPayload;
    } else {
      orders.unshift(orderPayload);
    }

    saveOrders(orders);

    if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
      window.maahiSupabase.saveOrder(orderPayload).catch(function (err) {
        console.warn("Supabase saveOrder failed for invoice:", err);
      });
    }

    closeInvoiceDrawer();
    renderTable();
    printInvoice(orderPayload);
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
    ["paid", "placed", "new", "confirmed", "processing", "shipped", "delivered", "cancelled"].forEach(function (v) {
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

    // Logistics & Tracking Management (Delivery Partner & Tracking ID)
    html += '<section class="detail-section" style="background: rgba(45, 106, 79, 0.08); border: 1px solid rgba(45, 106, 79, 0.2); border-radius: 10px; padding: 1rem;">';
    html += '  <h3 class="detail-section-title" style="color: var(--accent); margin-bottom: 0.65rem; display: flex; align-items: center; justify-content: space-between;">';
    html += '    <span>🚚 Delivery &amp; Tracking Details</span>';
    if (c.tracking_id) {
      html += '    <span style="font-size:0.72rem; background:#e8f5e9; color:#2d6a4f; padding:2px 8px; border-radius:4px; font-weight:700;">Active Tracking</span>';
    }
    html += '  </h3>';
    
    html += '  <form id="drawer-tracking-form" style="display:flex; flex-direction:column; gap:0.65rem;">';
    
    html += '    <div class="field" style="display:flex; flex-direction:column; gap:0.25rem;">';
    html += '      <label for="drawer-delivery-partner" style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text);">Delivery Partner / Courier</label>';
    html += '      <input type="text" id="drawer-delivery-partner" list="courier-list" placeholder="e.g. Delhivery, Blue Dart, DTDC, VRL Logistics" value="' + escapeHtml(c.delivery_partner || "") + '" style="width:100%; padding:0.55rem 0.75rem; border:1px solid rgba(45, 106, 79, 0.25); border-radius:6px; background:var(--bg); color:var(--text); font:inherit; font-size:0.85rem;">';
    html += '      <datalist id="courier-list">';
    html += '        <option value="Delhivery">';
    html += '        <option value="Blue Dart">';
    html += '        <option value="DTDC">';
    html += '        <option value="VRL Logistics">';
    html += '        <option value="India Post (Speed Post)">';
    html += '        <option value="Shadowfax">';
    html += '        <option value="TCI Express">';
    html += '        <option value="Safexpress">';
    html += '        <option value="Self / Local Fleet">';
    html += '      </datalist>';
    html += '    </div>';

    html += '    <div class="field" style="display:flex; flex-direction:column; gap:0.25rem;">';
    html += '      <label for="drawer-tracking-id" style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text);">Tracking ID / AWB Number</label>';
    html += '      <input type="text" id="drawer-tracking-id" placeholder="e.g. DL123456789IN or AWB-88392" value="' + escapeHtml(c.tracking_id || "") + '" style="width:100%; padding:0.55rem 0.75rem; border:1px solid rgba(45, 106, 79, 0.25); border-radius:6px; background:var(--bg); color:var(--text); font:inherit; font-size:0.85rem; font-family:monospace;">';
    html += '    </div>';

    html += '    <div class="field" style="display:flex; flex-direction:column; gap:0.25rem;">';
    html += '      <label for="drawer-tracking-url" style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text);">Tracking Link (Optional)</label>';
    html += '      <input type="url" id="drawer-tracking-url" placeholder="https://www.delhivery.com/track/package/..." value="' + escapeHtml(c.tracking_url || "") + '" style="width:100%; padding:0.55rem 0.75rem; border:1px solid rgba(45, 106, 79, 0.25); border-radius:6px; background:var(--bg); color:var(--text); font:inherit; font-size:0.85rem;">';
    html += '    </div>';

    html += '    <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.35rem;">';
    html += '      <button type="submit" class="btn-primary" id="btn-save-tracking" style="padding:0.5rem 0.85rem; font-size:0.8rem; font-weight:700; flex:1; justify-content:center;">Save Tracking Details</button>';
    if (c.tracking_id || c.delivery_partner) {
      html += '      <button type="button" class="btn-logout" id="btn-clear-tracking" style="padding:0.5rem 0.75rem; font-size:0.8rem; font-weight:600;">Clear</button>';
    }
    html += '    </div>';
    html += '    <div id="drawer-tracking-feedback" style="font-size:0.78rem; font-weight:600; text-align:center; margin-top:0.2rem;" hidden></div>';
    html += '  </form>';
    html += '</section>';

    // Customer Profile Info
    html += '<section class="detail-section">';
    html += '  <h3 class="detail-section-title">Customer Profile</h3>';
    if (c.is_quote || (order.id && order.id.startsWith("QTE-")) || c.fulfillment === "quote") {
      html += '  <div style="margin-bottom:0.6rem; background:rgba(34,197,94,0.15); border:1px solid #22c55e; border-radius:6px; padding:0.4rem 0.65rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.3rem;">';
      html += '    <span style="font-size:0.75rem; font-weight:800; color:#15803d;">📋 WHOLESALE BULK QUOTE INQUIRY</span>';
      if (c.pincode) {
        html += '    <span style="font-size:0.75rem; font-family:monospace; font-weight:700; color:#15803d;">Destination PIN: ' + escapeHtml(c.pincode) + '</span>';
      }
      html += '  </div>';
    }
    if (c.is_b2b || c.gstin || order.is_b2b || order.gstin) {
      html += '  <div style="margin-bottom:0.6rem; background:rgba(45,106,79,0.12); border:1px solid rgba(45,106,79,0.3); border-radius:6px; padding:0.4rem 0.65rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.3rem;">';
      html += '    <span style="font-size:0.75rem; font-weight:800; color:var(--accent);">🏢 B2B TAX ORDER</span>';
      if (c.gstin || order.gstin) {
        html += '    <span style="font-size:0.75rem; font-family:monospace; font-weight:700; color:var(--gold);">GSTIN: ' + escapeHtml(c.gstin || order.gstin) + '</span>';
      }
      html += '  </div>';
    }
    if (c.company_name || order.company_name) {
      html += '  <div class="detail-row"><span class="detail-label">Company Name</span><span class="detail-val" style="font-weight:800; color:var(--accent);">' + escapeHtml(c.company_name || order.company_name) + '</span></div>';
    }
    html += '  <div class="detail-row"><span class="detail-label">Contact Person</span><span class="detail-val">' + escapeHtml(c.name || "—") + '</span></div>';
    html += '  <div class="detail-row"><span class="detail-label">Email</span><span class="detail-val">' + escapeHtml(c.email || "—") + '</span></div>';
    if (c.phone) {
      html += '  <div class="detail-row"><span class="detail-label">Phone Number</span><span class="detail-val">' + escapeHtml(c.phone) + '</span></div>';
      var rawPhone = c.phone.replace(/\D/g, "");
      var intlPhone = rawPhone.length === 10 ? ("91" + rawPhone) : rawPhone;
      html += '  <div style="margin-top:0.6rem; display:flex; gap:0.5rem;">';
      html += '    <a href="tel:' + escapeHtml(c.phone) + '" style="flex:1; text-align:center; background:#1b4332; color:#fff; padding:0.45rem 0.65rem; border-radius:6px; font-size:0.78rem; font-weight:700; text-decoration:none;">📞 Call Lead</a>';
      html += '    <a href="https://wa.me/' + intlPhone + '?text=' + encodeURIComponent('Hi, regarding your bulk quote request for MAAHI COCOPEAT AND COIR PRODUCTS (Ref: ' + order.id + ')...') + '" target="_blank" rel="noopener" style="flex:1; text-align:center; background:#128c7e; color:#fff; padding:0.45rem 0.65rem; border-radius:6px; font-size:0.78rem; font-weight:700; text-decoration:none;">💬 WhatsApp Lead</a>';
      html += '  </div>';
    }
    html += '</section>';

    // Delivery & Logistic Notes
    html += '<section class="detail-section">';
    html += '  <h3 class="detail-section-title">Fulfillment Details</h3>';
    var fulfillMap = {
      ship: "Deliver to Location",
      pickup: "Customer Arrange Pickup",
      export: "Export Documentation Request",
      quote: "Wholesale Quote Request"
    };
    var fulfillText = fulfillMap[c.fulfillment] || c.fulfillment || "—";
    html += '  <div class="detail-row"><span class="detail-label">Fulfillment type</span><span class="detail-val">' + escapeHtml(fulfillText) + '</span></div>';
    if (c.pincode) {
      html += '  <div class="detail-row"><span class="detail-label">Delivery PIN Code</span><span class="detail-val" style="font-weight:700; color:var(--accent);">' + escapeHtml(c.pincode) + '</span></div>';
    }
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
      var itemPrice = l.unitPrice != null ? l.unitPrice : (l.price != null ? l.price : 0);
      var itemQty = l.qty != null ? l.qty : (l.quantity != null ? l.quantity : 1);
      var itemTotal = l.lineTotal != null ? l.lineTotal : itemPrice * itemQty;
      var bulkBadge = l.discountPercent > 0 
        ? ' <span style="display:inline-block; background:rgba(45,106,79,0.15); color:var(--accent); border:1px solid rgba(45,106,79,0.3); border-radius:3px; font-size:0.7rem; font-weight:700; padding:1px 4px; margin-left:4px;">' + l.discountPercent + '% BULK OFF</span>' 
        : '';

      html += '    <li>';
      html += '      <div>';
      html += '        <span class="line-title">' + escapeHtml(l.title || l.name || l.id) + bulkBadge + '</span>';
      html += '        <span class="line-qty">× ' + itemQty + (l.discountPercent > 0 ? ' @ ₹' + itemPrice : '') + '</span>';
      html += '      </div>';
      html += '      <span class="line-price">' + formatMoney(itemTotal) + '</span>';
      html += '    </li>';
    });
    html += '  </ul>';
    html += '  <div class="drawer-subtotal">';
    html += '    <span>Subtotal</span>';
    html += '    <span class="drawer-subtotal-val">' + formatMoney(order.subtotal) + '</span>';
    html += '  </div>';
    if (order.total_savings > 0) {
      html += '  <div class="drawer-subtotal" style="color: #067d17; font-size: 0.85rem; padding-top: 0.25rem; border-top: none;">';
      html += '    <span>Wholesale Savings</span>';
      html += '    <span>- ' + formatMoney(order.total_savings) + '</span>';
      html += '  </div>';
    }
    html += '  <div style="margin-top: 1.25rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">';
    html += '    <button type="button" class="btn-primary" id="btn-print-drawer-invoice" style="flex: 1.2; justify-content: center; padding: 0.65rem 0.85rem; font-weight: 700;">🧾 Print Tax Invoice</button>';
    html += '    <button type="button" class="btn-logout" id="btn-edit-drawer-invoice" style="flex: 0.8; justify-content: center; padding: 0.65rem 0.85rem; font-weight: 600;">✏️ Edit Invoice</button>';
    html += '  </div>';
    html += '  <div style="margin-top: 0.75rem;">';
    html += '    <button type="button" id="btn-drawer-delete-order" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.45rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.35); color: #dc2626; padding: 0.65rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: background 0.2s;">🗑️ Delete Order / Inquiry Permanently</button>';
    html += '  </div>';
    html += '</section>';

    drawerBody.innerHTML = html;

    // Attach delete order handler
    var deleteDrawerBtn = drawerBody.querySelector("#btn-drawer-delete-order");
    if (deleteDrawerBtn) {
      deleteDrawerBtn.addEventListener("click", function () {
        deleteOrder(order.id);
      });
    }

    // Attach invoice print & edit handlers
    var printInvoiceBtn = drawerBody.querySelector("#btn-print-drawer-invoice");
    if (printInvoiceBtn) {
      printInvoiceBtn.addEventListener("click", function () {
        printInvoice(order);
      });
    }

    var editInvoiceBtn = drawerBody.querySelector("#btn-edit-drawer-invoice");
    if (editInvoiceBtn) {
      editInvoiceBtn.addEventListener("click", function () {
        closeDetail();
        openInvoiceDrawer(order);
      });
    }

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

    // Attach tracking form submit handler
    var trackingForm = drawerBody.querySelector("#drawer-tracking-form");
    if (trackingForm) {
      trackingForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var partnerVal = drawerBody.querySelector("#drawer-delivery-partner").value.trim();
        var trackIdVal = drawerBody.querySelector("#drawer-tracking-id").value.trim();
        var trackUrlVal = drawerBody.querySelector("#drawer-tracking-url").value.trim();
        var feedback = drawerBody.querySelector("#drawer-tracking-feedback");
        var saveBtn = drawerBody.querySelector("#btn-save-tracking");

        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
        }

        updateOrderTracking(order.id, {
          delivery_partner: partnerVal,
          tracking_id: trackIdVal,
          tracking_url: trackUrlVal
        }).then(function () {
          if (feedback) {
            feedback.textContent = "✓ Tracking details saved & synced to customer view!";
            feedback.style.color = "#067d17";
            feedback.hidden = false;
          }
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Tracking Details";
          }
          renderTable();
          setTimeout(function () {
            var currentOrders = loadOrders();
            var fresh = null;
            for (var i = 0; i < currentOrders.length; i++) {
              if (currentOrders[i].id === order.id) {
                fresh = currentOrders[i];
                break;
              }
            }
            if (fresh) openDetail(fresh);
          }, 800);
        }).catch(function (err) {
          if (feedback) {
            feedback.textContent = "Failed to save: " + err.message;
            feedback.style.color = "#b91c1c";
            feedback.hidden = false;
          }
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Tracking Details";
          }
        });
      });

      var clearBtn = drawerBody.querySelector("#btn-clear-tracking");
      if (clearBtn) {
        clearBtn.addEventListener("click", function () {
          if (confirm("Clear tracking info for this order?")) {
            updateOrderTracking(order.id, {
              delivery_partner: "",
              tracking_id: "",
              tracking_url: ""
            }).then(function () {
              var currentOrders = loadOrders();
              var fresh = null;
              for (var i = 0; i < currentOrders.length; i++) {
                if (currentOrders[i].id === order.id) {
                  fresh = currentOrders[i];
                  break;
                }
              }
              if (fresh) openDetail(fresh);
              renderTable();
            });
          }
        });
      }
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

      var trackingBadge = (c.delivery_partner || c.tracking_id)
        ? '<div style="margin-top:4px; font-size:0.72rem; color:var(--accent); font-weight:600; display:flex; align-items:center; gap:4px; background:rgba(45,106,79,0.08); padding:2px 6px; border-radius:4px; border:1px solid rgba(45,106,79,0.18);"><span>🚚</span><span>' + escapeHtml(c.delivery_partner || 'Courier') + (c.tracking_id ? ': <code style="font-size:0.72rem; font-weight:700;">' + escapeHtml(c.tracking_id) + '</code>' : '') + '</span></div>'
        : '';

      var paymentBadge = c.razorpay_payment_id 
        ? '<span style="display:block; margin-top:3px; padding:1px 6px; border-radius:4px; font-size:0.7rem; font-weight:700; background:#e8f5e9; color:#2d6a4f; border:1px solid #c8e6c9;">✓ Paid</span>' 
        : '';

      tr.innerHTML =
        '<td><span class="mono">' + escapeHtml(o.id) + '</span></td>' +
        '<td>' + escapeHtml(dt) + '</td>' +
        '<td class="customer-cell"><strong>' + escapeHtml(c.name || "—") + '</strong><span>' + escapeHtml(c.email || "") + '</span></td>' +
        '<td><span class="amount-text">' + amountVal + '</span></td>' +
        '<td><strong>' + escapeHtml(fulfillText) + '</strong><span style="display:block; font-size:0.75rem; color:var(--text-muted);">' + escapeHtml(dateLabel) + '</span>' + trackingBadge + '</td>' +
        '<td><span class="' + statusClass(st) + '">' + escapeHtml(st) + '</span>' + paymentBadge + '</td>' +
        '<td style="text-align: right;"></td>';
      
      var actionCell = tr.querySelector("td:last-child");
      actionCell.style.display = "flex";
      actionCell.style.gap = "0.35rem";
      actionCell.style.justifyContent = "flex-end";
      actionCell.style.flexWrap = "nowrap";

      var invBtn = document.createElement("button");
      invBtn.type = "button";
      invBtn.className = "btn-invoice-print";
      invBtn.innerHTML = "🧾 Invoice";
      invBtn.title = "Print / Download Tax Invoice";
      invBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        printInvoice(o);
      });

      var viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "btn-small";
      viewBtn.textContent = "View";
      viewBtn.addEventListener("click", function () {
        openDetail(o);
      });

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-delete-order";
      delBtn.innerHTML = "🗑️";
      delBtn.title = "Delete Order";
      delBtn.style.background = "rgba(239, 68, 68, 0.1)";
      delBtn.style.border = "1px solid rgba(239, 68, 68, 0.3)";
      delBtn.style.color = "#ef4444";
      delBtn.style.borderRadius = "6px";
      delBtn.style.padding = "0.35rem 0.55rem";
      delBtn.style.cursor = "pointer";
      delBtn.style.fontSize = "0.82rem";
      delBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        deleteOrder(o.id);
      });
      
      actionCell.appendChild(invBtn);
      actionCell.appendChild(viewBtn);
      actionCell.appendChild(delBtn);
      tbody.appendChild(tr);
    });

    renderRecentOrders();
    renderQuotesTable();
  }

  function renderRecentOrders() {
    var overviewTbody = document.getElementById("overview-orders-tbody");
    var overviewEmpty = document.getElementById("overview-orders-empty");
    var overviewTable = document.getElementById("overview-orders-table");
    if (!overviewTbody) return;

    overviewTbody.innerHTML = "";
    var orders = loadOrders();
    if (!orders || orders.length === 0) {
      if (overviewEmpty) overviewEmpty.removeAttribute("hidden");
      if (overviewTable) overviewTable.hidden = true;
      return;
    }

    if (overviewEmpty) overviewEmpty.setAttribute("hidden", "true");
    if (overviewTable) overviewTable.hidden = false;

    var recent = orders.slice(0, 8);
    recent.forEach(function (o) {
      var tr = document.createElement("tr");
      var c = o.customer || {};
      var st = o.status || "new";
      var dt = formatDate(o.createdAt);
      var amountVal = formatMoney(o.subtotal);
      
      var fulfillText = c.fulfillment === "ship" ? "Delivery" :
                        c.fulfillment === "pickup" ? "Pickup" :
                        c.fulfillment === "export" ? "Export" : "Quote";

      var trackingBadge = (c.delivery_partner || c.tracking_id)
        ? '<div style="margin-top:3px; font-size:0.7rem; color:var(--accent); font-weight:600;">🚚 ' + escapeHtml(c.delivery_partner || 'Courier') + (c.tracking_id ? ': <code>' + escapeHtml(c.tracking_id) + '</code>' : '') + '</div>'
        : '';

      var paymentBadge = c.razorpay_payment_id 
        ? '<span style="display:block; margin-top:3px; padding:1px 6px; border-radius:4px; font-size:0.7rem; font-weight:700; background:#e8f5e9; color:#2d6a4f; border:1px solid #c8e6c9;">✓ Paid</span>' 
        : '';

      tr.innerHTML =
        '<td><span class="mono">' + escapeHtml(o.id) + '</span></td>' +
        '<td>' + escapeHtml(dt) + '</td>' +
        '<td class="customer-cell"><strong>' + escapeHtml(c.name || "—") + '</strong><span>' + escapeHtml(c.email || "") + '</span></td>' +
        '<td><span class="amount-text">' + amountVal + '</span></td>' +
        '<td><strong>' + escapeHtml(fulfillText) + '</strong>' + trackingBadge + '</td>' +
        '<td><span class="' + statusClass(st) + '">' + escapeHtml(st) + '</span>' + paymentBadge + '</td>' +
        '<td style="text-align: right;"></td>';

      var actionCell = tr.querySelector("td:last-child");
      actionCell.style.display = "flex";
      actionCell.style.gap = "0.35rem";
      actionCell.style.justifyContent = "flex-end";
      actionCell.style.flexWrap = "nowrap";

      var invBtn = document.createElement("button");
      invBtn.type = "button";
      invBtn.className = "btn-invoice-print";
      invBtn.innerHTML = "🧾 Invoice";
      invBtn.title = "Print / Download Tax Invoice";
      invBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        printInvoice(o);
      });

      var viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "btn-small";
      viewBtn.textContent = "View";
      viewBtn.addEventListener("click", function () {
        openDetail(o);
      });

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-delete-order";
      delBtn.innerHTML = "🗑️";
      delBtn.title = "Delete Order";
      delBtn.style.background = "rgba(239, 68, 68, 0.1)";
      delBtn.style.border = "1px solid rgba(239, 68, 68, 0.3)";
      delBtn.style.color = "#ef4444";
      delBtn.style.borderRadius = "6px";
      delBtn.style.padding = "0.35rem 0.55rem";
      delBtn.style.cursor = "pointer";
      delBtn.style.fontSize = "0.82rem";
      delBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        deleteOrder(o.id);
      });

      actionCell.appendChild(invBtn);
      actionCell.appendChild(viewBtn);
      actionCell.appendChild(delBtn);
      overviewTbody.appendChild(tr);
    });
  }

  // --- PERMANENT ORDER DELETION ---
  function deleteOrder(orderId) {
    if (!orderId) return;
    if (!confirm("Are you sure you want to permanently delete order #" + orderId + "?\n\nThis will remove the record from your dashboard and database.")) {
      return;
    }

    // 1. Record in persistent tombstone map
    markOrderAsDeleted(orderId);

    // 2. Remove immediately from LocalStorage
    var orders = loadOrders();
    var filtered = orders.filter(function (o) {
      return o && o.id !== orderId;
    });
    saveOrders(filtered);

    // 3. Delete from Supabase if connected
    if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
      window.maahiSupabase.deleteOrder(orderId).then(function () {
        console.log("Order permanently deleted from Supabase:", orderId);
      }).catch(function (err) {
        console.warn("Failed to delete order from Supabase:", err);
      });
    }

    closeDetail();
    renderStats(filtered);
    renderTable();
    renderQuotesTable();
    renderRecentOrders();
  }

  // --- QUOTE INQUIRIES CONTROLLER ---
  function getQuotes() {
    var allOrders = loadOrders();
    return allOrders.filter(function (o) {
      if (!o) return false;
      var isQ = (o.id && o.id.startsWith("QTE-")) ||
                (o.customer && (o.customer.is_quote || o.customer.fulfillment === "quote"));
      return isQ;
    });
  }

  function getFilteredQuotes() {
    var quotes = getQuotes();
    var qInp = document.getElementById("quotes-search");
    var q = (qInp && qInp.value.trim().toLowerCase()) || "";
    if (!q) return quotes;
    return quotes.filter(function (o) {
      var prodTitles = (o.lines || []).map(function(l) { return l.title || l.name || l.sku || ""; }).join(" ");
      var blob = (o.id || "") + " " +
                 (o.customer && o.customer.name) + " " +
                 (o.customer && o.customer.phone) + " " +
                 (o.customer && o.customer.email) + " " +
                 (o.customer && o.customer.pincode) + " " +
                 (o.customer && o.customer.notes) + " " +
                 prodTitles;
      return blob.toLowerCase().indexOf(q) !== -1;
    });
  }

  function renderQuotesStats(quotes) {
    var quotesStatsEl = document.getElementById("quotes-stats");
    var quotesBadge = document.getElementById("quotes-badge");
    
    if (quotesBadge) {
      if (quotes.length > 0) {
        quotesBadge.style.display = "inline-block";
        quotesBadge.textContent = quotes.length;
      } else {
        quotesBadge.style.display = "none";
      }
    }

    if (!quotesStatsEl) return;

    var totalQuotes = quotes.length;
    var totalVal = quotes.reduce(function (sum, o) {
      return sum + (Number(o.subtotal) || 0);
    }, 0);
    var totalSavings = quotes.reduce(function (sum, o) {
      return sum + (Number(o.total_savings) || 0);
    }, 0);

    var html = "";
    html += '<article class="metric-card">';
    html += '  <div class="card-info">';
    html += '    <p class="label">Total Inquiries</p>';
    html += '    <p class="value">' + totalQuotes + '</p>';
    html += '    <span class="trend-badge up">Wholesale Leads</span>';
    html += '  </div>';
    html += '  <div class="card-icon-bg" aria-hidden="true">📋</div>';
    html += '</article>';

    html += '<article class="metric-card">';
    html += '  <div class="card-info">';
    html += '    <p class="label">Estimated Value</p>';
    html += '    <p class="value">' + formatMoney(totalVal) + '</p>';
    html += '    <span class="trend-badge">Bulk Demand</span>';
    html += '  </div>';
    html += '  <div class="card-icon-bg" aria-hidden="true">₹</div>';
    html += '</article>';

    html += '<article class="metric-card">';
    html += '  <div class="card-info">';
    html += '    <p class="label">Potential Savings</p>';
    html += '    <p class="value">' + formatMoney(totalSavings) + '</p>';
    html += '    <span class="trend-badge">Tier Discounts</span>';
    html += '  </div>';
    html += '  <div class="card-icon-bg" aria-hidden="true">🏷️</div>';
    html += '</article>';

    quotesStatsEl.innerHTML = html;
  }

  function renderQuotesTable() {
    var quotes = getFilteredQuotes();
    var allQuotes = getQuotes();
    renderQuotesStats(allQuotes);

    var qTbody = document.getElementById("quotes-tbody");
    var qEmpty = document.getElementById("quotes-empty");
    var qTable = document.getElementById("quotes-table");

    if (!qTbody) return;
    qTbody.innerHTML = "";

    if (!quotes.length) {
      if (qEmpty) qEmpty.removeAttribute("hidden");
      if (qTable) qTable.hidden = true;
      return;
    }

    if (qEmpty) qEmpty.setAttribute("hidden", "true");
    if (qTable) qTable.hidden = false;

    quotes.forEach(function (o) {
      var tr = document.createElement("tr");
      var c = o.customer || {};
      var dt = formatDate(o.createdAt);
      var firstLine = (o.lines && o.lines[0]) || {};
      var prodTitle = firstLine.title || firstLine.name || "Bulk Products";
      var prodSku = firstLine.sku || "";
      var qtyVal = firstLine.qty || firstLine.quantity || 1;
      var pinVal = c.pincode || "—";
      var rawPhone = (c.phone || "").replace(/\D/g, "");
      var intlPhone = rawPhone.length === 10 ? ("91" + rawPhone) : rawPhone;

      var prodInfoHtml = '<strong>' + escapeHtml(prodTitle) + '</strong>' + 
                         (prodSku ? '<span style="display:block; font-size:0.72rem; color:var(--accent); font-family:monospace;">SKU: ' + escapeHtml(prodSku) + '</span>' : '');

      var contactHtml = '<strong>' + escapeHtml(c.name || "Customer") + '</strong>' +
                        (c.phone ? '<span style="display:block; font-size:0.78rem; font-weight:600;"><a href="tel:' + escapeHtml(c.phone) + '" style="color:var(--gold); text-decoration:underline;">' + escapeHtml(c.phone) + '</a></span>' : '') +
                        (c.email ? '<span style="display:block; font-size:0.72rem; color:var(--text-muted);">' + escapeHtml(c.email) + '</span>' : '');

      var savingsBadge = o.total_savings > 0 ? '<span style="display:block; font-size:0.7rem; color:#166534; font-weight:700;">Save ' + formatMoney(o.total_savings) + '</span>' : '';

      tr.innerHTML = 
        '<td><span class="mono" style="font-weight:700; color:var(--accent);">' + escapeHtml(o.id) + '</span></td>' +
        '<td>' + escapeHtml(dt) + '</td>' +
        '<td>' + prodInfoHtml + '</td>' +
        '<td><strong style="font-size:0.92rem;">' + qtyVal + '</strong> units</td>' +
        '<td><span style="background:rgba(45,106,79,0.12); padding:2px 7px; border-radius:4px; font-weight:700; font-family:monospace; color:var(--accent);">' + escapeHtml(pinVal) + '</span></td>' +
        '<td class="customer-cell">' + contactHtml + '</td>' +
        '<td><span class="amount-text">' + formatMoney(o.subtotal) + '</span>' + savingsBadge + '</td>' +
        '<td style="text-align: right;"></td>';

      var actionCell = tr.querySelector("td:last-child");
      actionCell.style.display = "flex";
      actionCell.style.gap = "0.35rem";
      actionCell.style.justifyContent = "flex-end";
      actionCell.style.flexWrap = "nowrap";

      if (rawPhone) {
        var callLink = document.createElement("a");
        callLink.href = "tel:" + c.phone;
        callLink.className = "btn-small";
        callLink.title = "Call Customer";
        callLink.style.background = "#1b4332";
        callLink.style.color = "#fff";
        callLink.style.padding = "0.35rem 0.6rem";
        callLink.style.textDecoration = "none";
        callLink.innerHTML = "📞";
        actionCell.appendChild(callLink);

        var waLink = document.createElement("a");
        waLink.href = "https://wa.me/" + intlPhone + "?text=" + encodeURIComponent("Hi, regarding your bulk quote request for " + prodTitle + " (Ref: " + o.id + ")...");
        waLink.target = "_blank";
        waLink.rel = "noopener";
        waLink.className = "btn-small";
        waLink.title = "Message on WhatsApp";
        waLink.style.background = "#128c7e";
        waLink.style.color = "#fff";
        waLink.style.padding = "0.35rem 0.6rem";
        waLink.style.textDecoration = "none";
        waLink.innerHTML = "💬";
        actionCell.appendChild(waLink);
      }

      var viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "btn-small";
      viewBtn.textContent = "View";
      viewBtn.addEventListener("click", function () {
        openDetail(o);
      });
      actionCell.appendChild(viewBtn);

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn-delete-order";
      delBtn.innerHTML = "🗑️";
      delBtn.title = "Delete Quote Request";
      delBtn.style.background = "rgba(239, 68, 68, 0.1)";
      delBtn.style.border = "1px solid rgba(239, 68, 68, 0.3)";
      delBtn.style.color = "#ef4444";
      delBtn.style.borderRadius = "6px";
      delBtn.style.padding = "0.35rem 0.55rem";
      delBtn.style.cursor = "pointer";
      delBtn.style.fontSize = "0.82rem";
      delBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        deleteOrder(o.id);
      });
      actionCell.appendChild(delBtn);

      qTbody.appendChild(tr);
    });
  }

  function exportQuotesExcel() {
    var quotes = getQuotes();
    if (!quotes.length) {
      alert("No quote inquiries available to export.");
      return;
    }
    var headers = ["Quote Ref", "Date", "Product", "SKU", "Quantity", "PIN Code", "Customer Name", "Phone", "Email", "Amount (INR)", "Notes"];
    var rows = quotes.map(function (o) {
      var c = o.customer || {};
      var l = (o.lines && o.lines[0]) || {};
      return [
        o.id,
        o.createdAt ? o.createdAt.slice(0, 19).replace("T", " ") : "",
        l.title || l.name || "",
        l.sku || "",
        l.qty || l.quantity || 1,
        c.pincode || "",
        c.name || "",
        c.phone || "",
        c.email || "",
        o.subtotal || 0,
        c.notes || ""
      ];
    });
    var csvContent = [headers.join(",")].concat(rows.map(function (r) {
      return r.map(function (val) {
        return '"' + String(val).replace(/"/g, '""') + '"';
      }).join(",");
    })).join("\r\n");

    var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "maahi_quote_inquiries_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    html += '<div class="footer">MAAHI COCOPEAT AND COIR PRODUCTS — Owner Console Report &copy; ' + new Date().getFullYear() + '</div>';
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
    
    printDataAsPDF("MAAHI COCOPEAT AND COIR PRODUCTS — Orders Report", headers, rows);
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
    
    printDataAsPDF("MAAHI COCOPEAT AND COIR PRODUCTS — Inventory Report", headers, rows);
  }

  // --- CLIENT SIDE ROUTING ---
  function initRouter() {
    var navOverview = document.getElementById("nav-overview");
    var navOrders = document.getElementById("nav-orders");
    var navQuotes = document.getElementById("nav-quotes");
    var navInventory = document.getElementById("nav-inventory");
    var navDatabase = document.getElementById("nav-database");

    var mobNavOverview = document.getElementById("mob-nav-overview");
    var mobNavOrders = document.getElementById("mob-nav-orders");
    var mobNavQuotes = document.getElementById("mob-nav-quotes");
    var mobNavInventory = document.getElementById("mob-nav-inventory");
    var mobNavDatabase = document.getElementById("mob-nav-database");

    var tabOverview = document.getElementById("tab-overview");
    var tabOrders = document.getElementById("tab-orders");
    var tabQuotes = document.getElementById("tab-quotes");
    var tabInventory = document.getElementById("tab-inventory");
    var tabDatabase = document.getElementById("tab-database");

    function handleRoute() {
      var hash = window.location.hash || "#overview";

      if (tabOverview) tabOverview.style.display = "none";
      if (tabOrders) tabOrders.style.display = "none";
      if (tabQuotes) tabQuotes.style.display = "none";
      if (tabInventory) tabInventory.style.display = "none";
      if (tabDatabase) tabDatabase.style.display = "none";

      if (navOverview) navOverview.classList.remove("active");
      if (navOrders) navOrders.classList.remove("active");
      if (navQuotes) navQuotes.classList.remove("active");
      if (navInventory) navInventory.classList.remove("active");
      if (navDatabase) navDatabase.classList.remove("active");

      if (mobNavOverview) mobNavOverview.classList.remove("active");
      if (mobNavOrders) mobNavOrders.classList.remove("active");
      if (mobNavQuotes) mobNavQuotes.classList.remove("active");
      if (mobNavInventory) mobNavInventory.classList.remove("active");
      if (mobNavDatabase) mobNavDatabase.classList.remove("active");

      if (hash === "#overview") {
        if (tabOverview) tabOverview.style.display = "block";
        if (navOverview) navOverview.classList.add("active");
        if (mobNavOverview) mobNavOverview.classList.add("active");
        refreshOrdersData();
      } else if (hash === "#orders") {
        if (tabOrders) tabOrders.style.display = "block";
        if (navOrders) navOrders.classList.add("active");
        if (mobNavOrders) mobNavOrders.classList.add("active");
        refreshOrdersData();
      } else if (hash === "#quotes") {
        if (tabQuotes) tabQuotes.style.display = "block";
        if (navQuotes) navQuotes.classList.add("active");
        if (mobNavQuotes) mobNavQuotes.classList.add("active");
        refreshOrdersData();
        renderQuotesTable();
      } else if (hash === "#inventory") {
        if (tabInventory) tabInventory.style.display = "block";
        if (navInventory) navInventory.classList.add("active");
        if (mobNavInventory) mobNavInventory.classList.add("active");
        refreshCatalogData();
      } else if (hash === "#database") {
        if (tabDatabase) tabDatabase.style.display = "block";
        if (navDatabase) navDatabase.classList.add("active");
        if (mobNavDatabase) mobNavDatabase.classList.add("active");
        updateDatabaseUI();
      }
    }

    window.addEventListener("hashchange", handleRoute);

    [navOverview, navOrders, navQuotes, navInventory, navDatabase, mobNavOverview, mobNavOrders, mobNavQuotes, mobNavInventory, mobNavDatabase].forEach(function (el) {
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
          refreshOrdersData();
          refreshCatalogData();
          
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

  var btnRefreshOrders = document.getElementById("btn-refresh-orders");
  if (btnRefreshOrders) {
    btnRefreshOrders.addEventListener("click", function () {
      btnRefreshOrders.disabled = true;
      btnRefreshOrders.textContent = "Syncing...";
      refreshOrdersData();
      setTimeout(function () {
        btnRefreshOrders.disabled = false;
        btnRefreshOrders.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Refresh &amp; Sync';
      }, 700);
    });
  }

  var btnRefreshOverview = document.getElementById("btn-refresh-overview");
  if (btnRefreshOverview) {
    btnRefreshOverview.addEventListener("click", function () {
      btnRefreshOverview.disabled = true;
      btnRefreshOverview.textContent = "Syncing...";
      refreshOrdersData();
      setTimeout(function () {
        btnRefreshOverview.disabled = false;
        btnRefreshOverview.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Refresh Data';
      }, 700);
    });
  }

  // Periodic background refresh every 20 seconds
  setInterval(function () {
    if (document.visibilityState === "visible") {
      refreshOrdersData();
    }
  }, 20000);

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

  // Quote Inquiries Listeners
  var quotesSearch = document.getElementById("quotes-search");
  if (quotesSearch) {
    quotesSearch.addEventListener("input", renderQuotesTable);
  }

  var btnRefreshQuotes = document.getElementById("btn-refresh-quotes");
  if (btnRefreshQuotes) {
    btnRefreshQuotes.addEventListener("click", function () {
      btnRefreshQuotes.disabled = true;
      btnRefreshQuotes.textContent = "Syncing...";
      refreshOrdersData();
      setTimeout(function () {
        btnRefreshQuotes.disabled = false;
        btnRefreshQuotes.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Refresh &amp; Sync';
      }, 700);
    });
  }

  var btnExportQuotesExcel = document.getElementById("btn-export-quotes-excel");
  if (btnExportQuotesExcel) {
    btnExportQuotesExcel.addEventListener("click", exportQuotesExcel);
  }

  var btnCreateInvoiceQuotes = document.getElementById("btn-create-invoice-quotes");
  if (btnCreateInvoiceQuotes) {
    btnCreateInvoiceQuotes.addEventListener("click", function () {
      openInvoiceDrawer();
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", function () {
      sessionStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(PROFILE_KEY);
      
      if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
        window.maahiSupabase.signOut().then(function () {
          window.location.replace("../login.html?role=admin");
        }).catch(function () {
          window.location.replace("../login.html?role=admin");
        });
      } else {
        window.location.replace("../login.html?role=admin");
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
      closeInvoiceDrawer();
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
      if (invoiceDrawer && invoiceDrawer.classList.contains("is-open")) {
        closeInvoiceDrawer();
      }
    }
  });

  // Invoice Drawer Listeners
  if (btnCreateInvoiceOverview) {
    btnCreateInvoiceOverview.addEventListener("click", function () {
      openInvoiceDrawer();
    });
  }

  if (btnCreateInvoiceOrders) {
    btnCreateInvoiceOrders.addEventListener("click", function () {
      openInvoiceDrawer();
    });
  }

  if (invoiceClose) {
    invoiceClose.addEventListener("click", closeInvoiceDrawer);
  }

  if (btnCancelInvoice) {
    btnCancelInvoice.addEventListener("click", closeInvoiceDrawer);
  }

  if (btnInvAddRow) {
    btnInvAddRow.addEventListener("click", function () {
      addInvoiceItemRow();
    });
  }

  if (invoiceForm) {
    invoiceForm.addEventListener("submit", handleInvoiceFormSubmit);
  }

  var invTaxRateEl = document.getElementById("inv-tax-rate");
  var invDiscountEl = document.getElementById("inv-discount");
  var invShippingEl = document.getElementById("inv-shipping");

  if (invTaxRateEl) invTaxRateEl.addEventListener("change", calcInvoiceTotals);
  if (invDiscountEl) invDiscountEl.addEventListener("input", calcInvoiceTotals);
  if (invShippingEl) invShippingEl.addEventListener("input", calcInvoiceTotals);

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
        window.location.replace("../login.html?role=admin");
      }
    });
  }

  // Mobile Sidebar Drawer Controls
  var sidebarEl = document.querySelector(".sidebar");
  var toggleBtn = document.getElementById("sidebar-toggle-btn");
  var backdropEl = document.getElementById("sidebar-backdrop");
  var closeMobileBtn = document.getElementById("sidebar-close-mobile-btn");

  function openMobileSidebar() {
    var sb = sidebarEl || document.querySelector(".sidebar");
    var bd = backdropEl || document.getElementById("sidebar-backdrop");
    if (sb) sb.classList.add("is-open");
    if (bd) bd.classList.add("is-visible");
  }

  function closeMobileSidebar() {
    var sb = sidebarEl || document.querySelector(".sidebar");
    var bd = backdropEl || document.getElementById("sidebar-backdrop");
    if (sb) sb.classList.remove("is-open");
    if (bd) bd.classList.remove("is-visible");
  }

  window.openMobileSidebar = openMobileSidebar;
  window.closeMobileSidebar = closeMobileSidebar;

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      openMobileSidebar();
    });
  }

  if (closeMobileBtn) {
    closeMobileBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      closeMobileSidebar();
    });
  }

  if (backdropEl) {
    backdropEl.addEventListener("click", closeMobileSidebar);
  }

  // Close sidebar on link click on mobile
  document.querySelectorAll(".sidebar-nav a").forEach(function (link) {
    link.addEventListener("click", function () {
      if (window.innerWidth <= 992) {
        closeMobileSidebar();
      }
    });
  });

  // Initial load
  refreshCatalogData();
  initRouter();
  window.maahiDashInitialized = true;
})();
