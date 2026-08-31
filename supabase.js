(function () {
  var URL_KEY = "maahi_supabase_url";
  var KEY_KEY = "maahi_supabase_key";

  var client = null;



  function initClient() {
    var url = localStorage.getItem(URL_KEY) || (window.MAAHI_CONFIG && window.MAAHI_CONFIG.supabaseUrl) || "";
    var key = localStorage.getItem(KEY_KEY) || (window.MAAHI_CONFIG && window.MAAHI_CONFIG.supabaseAnonKey) || "";
    
    // Ignore placeholder truncated keys like "eyJhbGciOiJIUzI1NiIsInR..."
    if (key && key.indexOf("...") !== -1) {
      key = "";
    }

    if (url && key && window.supabase) {
      try {
        client = window.supabase.createClient(url, key);
      } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
        client = null;
      }
    } else {
      client = null;
    }
  }

  var isConnectionHealthy = false;
  var hasCheckedConnection = false;

  function verifyConnection() {
    if (!client) {
      isConnectionHealthy = false;
      hasCheckedConnection = true;
      return;
    }
    client
      .from("orders")
      .select("id")
      .limit(1)
      .then(function (res) {
        if (res.error) {
          var status = res.error.status;
          if (status === 401 || (res.error.message && res.error.message.indexOf("API key") !== -1)) {
            isConnectionHealthy = false;
          } else if (status === 400 || status === 403 || status === 404 || res.error.code === "P0001" || (res.error.message && res.error.message.indexOf("relation") !== -1)) {
            isConnectionHealthy = true;
          } else {
            isConnectionHealthy = false;
          }
        } else {
          isConnectionHealthy = true;
        }
        hasCheckedConnection = true;
      })
      .catch(function () {
        isConnectionHealthy = false;
        hasCheckedConnection = true;
      });
  }

  // Initialize client on script load
  initClient();
  verifyConnection();

  window.maahiSupabase = {
    // Re-initialize client if config changes
    reinit: function () {
      initClient();
      verifyConnection();
      return client !== null;
    },

    getClient: function () {
      return client;
    },

    isConnected: function () {
      return client !== null;
    },

    isHealthy: function () {
      return isConnectionHealthy;
    },

    hasChecked: function () {
      return hasCheckedConnection;
    },

    // Test a specific URL/Key combo
    testConnection: function (url, key) {
      return new Promise(function (resolve) {
        if (!window.supabase) {
          resolve({ success: false, message: "Supabase SDK not loaded in browser." });
          return;
        }
        if (!key || key.indexOf("...") !== -1 || key.length < 30) {
          resolve({ success: false, message: "Please enter your full Supabase Anon public key from Supabase Project Settings > API." });
          return;
        }
        try {
          var testClient = window.supabase.createClient(url, key);
          // Try to select from orders table
          testClient
            .from("orders")
            .select("id")
            .limit(1)
            .then(function (res) {
              if (res.error) {
                // If it's a relation error, tables might not be created, but connection works!
                if (res.error.code === "P0001" || res.error.message.indexOf("relation") !== -1) {
                  resolve({ 
                    success: true, 
                    message: "Connected! Warning: Tables do not exist yet. Please run the SQL setup script." 
                  });
                } else {
                  resolve({ success: false, message: res.error.message });
                }
              } else {
                resolve({ success: true, message: "Connection successful!" });
              }
            })
            .catch(function (err) {
              resolve({ success: false, message: err.message || "Network error" });
            });
        } catch (e) {
          resolve({ success: false, message: e.message || "Invalid URL or Key format" });
        }
      });
    },

    // Seed default catalog to Supabase
    syncLocalCatalog: function (catalog) {
      return new Promise(function (resolve, reject) {
        if (!client) {
          reject(new Error("Supabase not connected."));
          return;
        }

        var rows = Object.keys(catalog).map(function (id) {
          var p = catalog[id];
          return {
            id: id,
            title: p.title,
            price: p.price,
            unit_label: p.unitLabel || "item",
            image: p.image || null,
            thumb: p.thumb || null,
            tag: p.tag || null,
            description: p.desc || null,
            features: p.features || []
          };
        });

        // Upsert list
        client
          .from("products")
          .upsert(rows)
          .then(function (res) {
            if (res.error) reject(res.error);
            else resolve(true);
          })
          .catch(reject);
      });
    },

    // Fetch catalog
    fetchCatalog: function () {
      return new Promise(function (resolve) {
        if (!client) {
          resolve(null);
          return;
        }

        client
          .from("products")
          .select("*")
          .then(function (res) {
            if (res.error) {
              console.warn("Supabase fetchCatalog error:", res.error);
              resolve(null);
            } else {
              // Convert database format back to catalog object
              var catalog = {};
              res.data.forEach(function (row) {
                catalog[row.id] = {
                  title: row.title,
                  price: parseFloat(row.price),
                  unitLabel: row.unit_label,
                  image: row.image,
                  thumb: row.thumb,
                  tag: row.tag,
                  desc: row.description,
                  features: Array.isArray(row.features) ? row.features : []
                };
              });
              resolve(catalog);
            }
          })
          .catch(function (err) {
            console.warn("Supabase fetchCatalog network error:", err);
            resolve(null);
          });
      });
    },

    // Save product
    saveProduct: function (id, product) {
      return new Promise(function (resolve, reject) {
        if (!client) {
          reject(new Error("Supabase client not initialized"));
          return;
        }

        var row = {
          id: id,
          title: product.title,
          price: product.price,
          unit_label: product.unitLabel || "item",
          image: product.image || null,
          thumb: product.thumb || null,
          tag: product.tag || null,
          description: product.desc || null,
          features: product.features || []
        };

        client
          .from("products")
          .upsert([row])
          .then(function (res) {
            if (res.error) reject(res.error);
            else resolve(true);
          })
          .catch(reject);
      });
    },

    // Delete product
    deleteProduct: function (id) {
      return new Promise(function (resolve, reject) {
        if (!client) {
          reject(new Error("Supabase client not initialized"));
          return;
        }

        client
          .from("products")
          .delete()
          .eq("id", id)
          .then(function (res) {
            if (res.error) reject(res.error);
            else resolve(true);
          })
          .catch(reject);
      });
    },

    // Fetch pricing tiers for wholesale/bulk pricing
    fetchPricingTiers: function () {
      return new Promise(function (resolve) {
        if (!client) {
          resolve(null);
          return;
        }

        client
          .from("product_pricing_tiers")
          .select("*")
          .order("min_qty", { ascending: true })
          .then(function (res) {
            if (res.error) {
              console.warn("Supabase fetchPricingTiers error:", res.error);
              resolve(null);
            } else {
              var tiersMap = {};
              (res.data || []).forEach(function (t) {
                if (!tiersMap[t.product_id]) tiersMap[t.product_id] = [];
                tiersMap[t.product_id].push({
                  min: t.min_qty,
                  max: t.max_qty,
                  discount: parseFloat(t.discount_percent || 0),
                  fixedPrice: t.fixed_unit_price != null ? parseFloat(t.fixed_unit_price) : null
                });
              });
              resolve(tiersMap);
            }
          })
          .catch(function (err) {
            console.warn("Supabase fetchPricingTiers network error:", err);
            resolve(null);
          });
      });
    },

    // Save pricing tiers
    savePricingTiers: function (tiersList) {
      return new Promise(function (resolve, reject) {
        if (!client) {
          reject(new Error("Supabase client not initialized"));
          return;
        }

        client
          .from("product_pricing_tiers")
          .upsert(tiersList)
          .then(function (res) {
            if (res.error) reject(res.error);
            else resolve(true);
          })
          .catch(reject);
      });
    },

    // Fetch all orders
    fetchOrders: function () {
      return new Promise(function (resolve) {
        if (!client) {
          resolve(null);
          return;
        }

        client
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .then(function (res) {
            if (res.error) {
              console.warn("Supabase fetchOrders error:", res.error);
              resolve(null);
            } else if (!res.data) {
              resolve([]);
            } else {
              // Map DB fields to application order structures
              var mapped = res.data.map(function (row) {
                var lines = [];
                var customer = {};
                try {
                  lines = typeof row.lines === "string" ? JSON.parse(row.lines) : (row.lines || []);
                } catch(e) { lines = []; }
                try {
                  customer = typeof row.customer === "string" ? JSON.parse(row.customer) : (row.customer || {});
                } catch(e) { customer = {}; }

                return {
                  id: row.id,
                  createdAt: row.created_at || row.createdAt || new Date().toISOString(),
                  status: row.status || "new",
                  subtotal: parseFloat(row.subtotal) || 0,
                  lines: lines,
                  customer: customer
                };
              });
              resolve(mapped);
            }
          })
          .catch(function (err) {
            console.warn("Supabase fetchOrders network error:", err);
            resolve(null);
          });
      });
    },

    // Insert order
    saveOrder: function (order) {
      return new Promise(function (resolve, reject) {
        if (!client) {
          reject(new Error("Supabase client not initialized"));
          return;
        }

        var row = {
          id: order.id,
          created_at: order.createdAt,
          status: order.status || "new",
          subtotal: order.subtotal,
          lines: order.lines,
          customer: order.customer
        };

        client
          .from("orders")
          .insert([row])
          .then(function (res) {
            if (res.error) reject(res.error);
            else resolve(true);
          })
          .catch(reject);
      });
    },

    // Update order (status, customer tracking data, etc.)
    updateOrder: function (orderId, updates) {
      return new Promise(function (resolve, reject) {
        if (!client) {
          reject(new Error("Supabase client not initialized"));
          return;
        }

        var updatePayload = {};
        if (updates.status !== undefined) updatePayload.status = updates.status;
        if (updates.customer !== undefined) updatePayload.customer = updates.customer;
        if (updates.subtotal !== undefined) updatePayload.subtotal = updates.subtotal;
        if (updates.lines !== undefined) updatePayload.lines = updates.lines;

        client
          .from("orders")
          .update(updatePayload)
          .eq("id", orderId)
          .then(function (res) {
            if (res.error) reject(res.error);
            else resolve(true);
          })
          .catch(reject);
      });
    },

    // Update order status and optional customer metadata
    updateOrderStatus: function (orderId, status, customerUpdates) {
      var updates = { status: status };
      if (customerUpdates) updates.customer = customerUpdates;
      return this.updateOrder(orderId, updates);
    },

    // Supabase Auth Integration
    signInWithGoogle: function (redirectTo) {
      if (!client) return Promise.reject(new Error("Supabase client not initialized"));
      return client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo || window.location.origin + window.location.pathname
        }
      });
    },

    signOut: function () {
      if (!client) return Promise.reject(new Error("Supabase client not initialized"));
      return client.auth.signOut();
    },

    getSession: function () {
      if (!client) return Promise.resolve({ data: { session: null } });
      return client.auth.getSession();
    },

    onAuthStateChange: function (callback) {
      if (!client) return { data: { subscription: null } };
      return client.auth.onAuthStateChange(callback);
    }
  };
})();

