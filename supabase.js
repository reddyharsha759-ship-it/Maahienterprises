(function () {
  var URL_KEY = "maahi_supabase_url";
  var KEY_KEY = "maahi_supabase_key";

  var client = null;

  function initClient() {
    var url = (window.MAAHI_CONFIG && window.MAAHI_CONFIG.supabaseUrl) || localStorage.getItem(URL_KEY);
    var key = (window.MAAHI_CONFIG && window.MAAHI_CONFIG.supabaseAnonKey) || localStorage.getItem(KEY_KEY);
    
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

  // Initialize client on script load
  initClient();

  window.maahiSupabase = {
    // Re-initialize client if config changes
    reinit: function () {
      initClient();
      return client !== null;
    },

    getClient: function () {
      return client;
    },

    isConnected: function () {
      return client !== null;
    },

    // Test a specific URL/Key combo
    testConnection: function (url, key) {
      return new Promise(function (resolve) {
        if (!window.supabase) {
          resolve({ success: false, message: "Supabase SDK not loaded in browser." });
          return;
        }
        try {
          var testClient = window.supabase.createClient(url, key);
          // Try to select from products table
          testClient
            .from("products")
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
            } else {
              // Map DB fields to application order structures
              var mapped = res.data.map(function (row) {
                return {
                  id: row.id,
                  createdAt: row.created_at,
                  status: row.status,
                  subtotal: parseFloat(row.subtotal),
                  lines: typeof row.lines === "string" ? JSON.parse(row.lines) : row.lines,
                  customer: typeof row.customer === "string" ? JSON.parse(row.customer) : row.customer
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

    // Update order status
    updateOrderStatus: function (orderId, status) {
      return new Promise(function (resolve, reject) {
        if (!client) {
          reject(new Error("Supabase client not initialized"));
          return;
        }

        client
          .from("orders")
          .update({ status: status })
          .eq("id", orderId)
          .then(function (res) {
            if (res.error) reject(res.error);
            else resolve(true);
          })
          .catch(reject);
      });
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

