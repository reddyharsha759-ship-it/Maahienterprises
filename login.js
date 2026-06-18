(function () {
  // ================================================================
  // Storage Keys
  // ================================================================
  var CONSUMER_KEY = "maahi_consumer_profile";
  var LOCAL_USERS_KEY = "maahi_local_users";
  var AUTH_KEY = "maahi_owner_auth_token";

  // ================================================================
  // DOM References
  // ================================================================
  var loginCard = document.getElementById("login-card");
  var loginTitle = document.getElementById("login-title");
  var loginSubtitle = document.getElementById("login-subtitle");
  var visualDesc = document.getElementById("visual-desc");

  // Role switcher
  var roleBtnCustomer = document.getElementById("role-btn-customer");
  var roleBtnAdmin = document.getElementById("role-btn-admin");
  var roleSwitcherBg = document.getElementById("role-switcher-bg");

  // Tab headers (sign in / sign up — customer only)
  var authTabs = document.getElementById("auth-tabs");
  var tabSignin = document.getElementById("tab-btn-signin");
  var tabSignup = document.getElementById("tab-btn-signup");

  // Form wrappers
  var wrapperSignin = document.getElementById("signin-form-wrapper");
  var wrapperSignup = document.getElementById("signup-form-wrapper");
  var wrapperAdmin = document.getElementById("admin-form-wrapper");

  // Forms
  var signinForm = document.getElementById("signin-form");
  var signupForm = document.getElementById("signup-form");
  var adminForm = document.getElementById("admin-form");

  // Alerts
  var errorAlert = document.getElementById("login-error");
  var errorMsg = document.getElementById("login-error-msg");
  var successAlert = document.getElementById("login-success");
  var successMsg = document.getElementById("login-success-msg");



  // OAuth elements
  var oauthDivider = document.getElementById("oauth-divider");
  var googleBtn = document.getElementById("btn-google-login");
  var oauthModal = document.getElementById("google-oauth-modal");
  var oauthClose = document.getElementById("oauth-close");
  var accountsList = document.getElementById("google-accounts-list");
  var customForm = document.getElementById("google-custom-account-form");
  var oauthModalSubtitle = document.getElementById("oauth-modal-subtitle");

  // Other
  var forgotLink = document.getElementById("forgot-link");
  var adminForgotLink = document.getElementById("admin-forgot-link");

  // ================================================================
  // State
  // ================================================================
  var currentRole = "customer"; // "customer" or "admin"

  // Check query parameters for redirects
  var urlParams = new URLSearchParams(window.location.search);
  var redirectUrl = urlParams.get("redirect") || null;
  var initialRole = urlParams.get("role") || null;

  if (initialRole === "admin") {
    currentRole = "admin";
  }

  // ================================================================
  // Session Check — redirect immediately if already logged in
  // ================================================================
  if (currentRole === "customer" && localStorage.getItem(CONSUMER_KEY)) {
    window.location.href = redirectUrl || "index.html";
    return;
  }

  // ================================================================
  // Helpers
  // ================================================================
  function showError(message) {
    if (!errorAlert || !errorMsg) return;
    hideSuccess();
    errorMsg.textContent = message;
    errorAlert.removeAttribute("hidden");
    errorAlert.style.animation = "none";
    errorAlert.offsetHeight;
    errorAlert.style.animation = "";
  }

  function hideError() {
    if (errorAlert) errorAlert.setAttribute("hidden", "true");
  }

  function showSuccess(message) {
    if (!successAlert || !successMsg) return;
    hideError();
    successMsg.textContent = message;
    successAlert.removeAttribute("hidden");
  }

  function hideSuccess() {
    if (successAlert) successAlert.setAttribute("hidden", "true");
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getLocalUsers() {
    try {
      var raw = localStorage.getItem(LOCAL_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalUser(user) {
    var users = getLocalUsers();
    users.push(user);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  }

  // Clear error on any input
  document.querySelectorAll("input").forEach(function (inp) {
    inp.addEventListener("input", function () {
      hideError();
      hideSuccess();
    });
  });

  // ================================================================
  // Password Visibility Toggle
  // ================================================================
  document.querySelectorAll(".password-toggle").forEach(function (toggle) {
    toggle.addEventListener("click", function () {
      var targetId = toggle.getAttribute("data-toggle-for");
      var input = document.getElementById(targetId);
      var eyeIcon = toggle.querySelector("svg");
      if (!input || !eyeIcon) return;

      var isPressed = toggle.getAttribute("aria-pressed") === "true";
      toggle.setAttribute("aria-pressed", !isPressed ? "true" : "false");
      toggle.setAttribute("aria-label", !isPressed ? "Hide password" : "Show password");
      input.type = !isPressed ? "text" : "password";

      if (!isPressed) {
        eyeIcon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-9.3 12.8l1.4-1.4 15.6-15.6 1.4 1.4L4.1 21.8l-1.4-1.4z"/>';
      } else {
        eyeIcon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
      }
    });
  });

  // ================================================================
  // Forgot Password
  // ================================================================
  if (forgotLink) {
    forgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      showError("Password reset is disabled for this local demo. Please use the credentials provided.");
    });
  }
  if (adminForgotLink) {
    adminForgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      showError("Password reset is disabled for the local demo. Please use the credentials listed below.");
    });
  }

  // ================================================================
  // ROLE SWITCHER
  // ================================================================
  function switchRole(role) {
    currentRole = role;
    hideError();
    hideSuccess();

    if (role === "customer") {
      // Visual updates
      loginCard.classList.remove("is-admin");
      roleBtnCustomer.classList.add("active");
      roleBtnAdmin.classList.remove("active");
      roleSwitcherBg.classList.remove("is-admin");

      // Header text
      loginTitle.textContent = "Welcome Back";
      loginSubtitle.textContent = "Sign in to access your account.";
      if (visualDesc) visualDesc.textContent = "Create an account or sign in to track orders, save multiple delivery addresses, and coordinate seamless logistics for your growing requirements.";

      // Show customer tabs
      authTabs.classList.remove("hidden");
      // Show the currently active customer form
      showActiveCustomerForm();
      wrapperAdmin.classList.remove("active");

      // Google OAuth
      oauthDivider.style.display = "";
      googleBtn.style.display = "";
      if (oauthModalSubtitle) oauthModalSubtitle.textContent = "to continue to Maahi Products";



    } else {
      // Admin mode
      loginCard.classList.add("is-admin");
      roleBtnAdmin.classList.add("active");
      roleBtnCustomer.classList.remove("active");
      roleSwitcherBg.classList.add("is-admin");

      // Header text
      loginTitle.textContent = "Owner Dashboard";
      loginSubtitle.textContent = "Sign in with your admin credentials.";
      if (visualDesc) visualDesc.textContent = "Access the owner dashboard to manage production capacity, track customer orders, and coordinate sustainable logistics across partner units.";

      // Hide customer tabs, show admin form
      authTabs.classList.add("hidden");
      wrapperSignin.classList.remove("active");
      wrapperSignup.classList.remove("active");
      wrapperAdmin.classList.add("active");

      // Google OAuth
      oauthDivider.style.display = "";
      googleBtn.style.display = "";
      if (oauthModalSubtitle) oauthModalSubtitle.textContent = "to continue to Maahi Owner Dashboard";


    }
  }

  function showActiveCustomerForm() {
    if (tabSignin.classList.contains("active")) {
      wrapperSignin.classList.add("active");
      wrapperSignup.classList.remove("active");
    } else {
      wrapperSignup.classList.add("active");
      wrapperSignin.classList.remove("active");
    }
  }

  roleBtnCustomer.addEventListener("click", function () {
    if (currentRole !== "customer") switchRole("customer");
  });

  roleBtnAdmin.addEventListener("click", function () {
    if (currentRole !== "admin") switchRole("admin");
  });

  // If URL param specifies role, switch on load
  if (initialRole === "admin") {
    switchRole("admin");
  }

  // ================================================================
  // CUSTOMER TABS (Sign In / Sign Up)
  // ================================================================
  if (tabSignin && tabSignup) {
    tabSignin.addEventListener("click", function () {
      tabSignin.classList.add("active");
      tabSignin.setAttribute("aria-selected", "true");
      tabSignup.classList.remove("active");
      tabSignup.setAttribute("aria-selected", "false");
      wrapperSignin.classList.add("active");
      wrapperSignup.classList.remove("active");
      hideError();
      hideSuccess();
    });

    tabSignup.addEventListener("click", function () {
      tabSignup.classList.add("active");
      tabSignup.setAttribute("aria-selected", "true");
      tabSignin.classList.remove("active");
      tabSignin.setAttribute("aria-selected", "false");
      wrapperSignup.classList.add("active");
      wrapperSignin.classList.remove("active");
      hideError();
      hideSuccess();
    });
  }

  // ================================================================
  // CUSTOMER SIGN IN
  // ================================================================
  if (signinForm) {
    signinForm.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError();

      var email = document.getElementById("signin-email").value.trim();
      var password = document.getElementById("signin-password").value;
      var submitBtn = document.getElementById("signin-submit-btn");

      if (!email || !password) {
        showError("Please enter both email and password.");
        return;
      }
      if (!validateEmail(email)) {
        showError("Please enter a valid email address.");
        return;
      }

      if (submitBtn) {
        submitBtn.classList.add("is-loading");
        submitBtn.disabled = true;
      }

      setTimeout(function () {
        var userProfile = null;

        // Check registered local users
        var users = getLocalUsers();
        for (var i = 0; i < users.length; i++) {
          if (users[i].email === email && users[i].password === password) {
            userProfile = { name: users[i].name, email: users[i].email, addresses: users[i].addresses || [] };
            break;
          }
        }

        if (userProfile) {
          // Sync with existing addresses
          var oldProfile = null;
          try {
            var raw = localStorage.getItem(CONSUMER_KEY);
            if (raw) oldProfile = JSON.parse(raw);
          } catch(err) {}

          if (oldProfile && oldProfile.email === userProfile.email) {
            userProfile.addresses = oldProfile.addresses || [];
          }

          localStorage.setItem(CONSUMER_KEY, JSON.stringify(userProfile));
          window.location.href = redirectUrl || "index.html";
        } else {
          if (submitBtn) {
            submitBtn.classList.remove("is-loading");
            submitBtn.disabled = false;
          }
          showError("Incorrect email address or password. Please try again.");
        }
      }, 1000);
    });
  }

  // ================================================================
  // CUSTOMER SIGN UP
  // ================================================================
  if (signupForm) {
    signupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError();

      var name = document.getElementById("signup-name").value.trim();
      var email = document.getElementById("signup-email").value.trim();
      var password = document.getElementById("signup-password").value;
      var confirmPassword = document.getElementById("signup-confirm-password").value;
      var submitBtn = document.getElementById("signup-submit-btn");

      if (!name || !email || !password || !confirmPassword) {
        showError("Please fill in all fields.");
        return;
      }
      if (!validateEmail(email)) {
        showError("Please enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        showError("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        showError("Passwords do not match. Please verify.");
        return;
      }

      // Check duplicates
      var isExists = email === "consumer@gmail.com";
      if (!isExists) {
        var users = getLocalUsers();
        for (var i = 0; i < users.length; i++) {
          if (users[i].email === email) {
            isExists = true;
            break;
          }
        }
      }

      if (isExists) {
        showError("An account with this email address already exists.");
        return;
      }

      if (submitBtn) {
        submitBtn.classList.add("is-loading");
        submitBtn.disabled = true;
      }

      setTimeout(function () {
        saveLocalUser({ name: name, email: email, password: password, addresses: [] });
        var userProfile = { name: name, email: email, addresses: [] };
        localStorage.setItem(CONSUMER_KEY, JSON.stringify(userProfile));
        window.location.href = redirectUrl || "index.html";
      }, 1000);
    });
  }

  // ================================================================
  // ADMIN SIGN IN
  // ================================================================
  if (adminForm) {
    adminForm.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError();

      var email = document.getElementById("admin-email").value.trim();
      var password = document.getElementById("admin-password").value;
      var rememberCheckbox = document.getElementById("admin-remember");
      var submitBtn = document.getElementById("admin-submit-btn");

      if (!email) {
        showError("Please enter your email address.");
        return;
      }
      if (!validateEmail(email)) {
        showError("Please enter a valid email address.");
        return;
      }
      if (!password) {
        showError("Please enter your password.");
        return;
      }

      if (submitBtn) {
        submitBtn.classList.add("is-loading");
        submitBtn.disabled = true;
      }

      setTimeout(function () {
        var userProfile = null;
        var config = window.MAAHI_CONFIG || {};
        if (config.adminEmail && email === config.adminEmail && password === config.adminPassword) {
          userProfile = { name: "Maahi Admin", role: "Administrator", email: config.adminEmail };
        } else if (config.contractorEmail && email === config.contractorEmail && password === config.contractorPassword) {
          userProfile = { name: "Maahi Contractor", role: "Contractor", email: config.contractorEmail };
        }

        if (userProfile) {
          var token = "maahi_demo_token_" + Math.random().toString(36).substring(2);
          var remember = rememberCheckbox ? rememberCheckbox.checked : false;

          if (remember) {
            localStorage.setItem(AUTH_KEY, token);
            localStorage.setItem("maahi_user_profile", JSON.stringify(userProfile));
            sessionStorage.removeItem(AUTH_KEY);
            sessionStorage.removeItem("maahi_user_profile");
          } else {
            sessionStorage.setItem(AUTH_KEY, token);
            sessionStorage.setItem("maahi_user_profile", JSON.stringify(userProfile));
            localStorage.removeItem(AUTH_KEY);
            localStorage.removeItem("maahi_user_profile");
          }

          window.location.href = "owner/dashboard.html";
        } else {
          if (submitBtn) {
            submitBtn.classList.remove("is-loading");
            submitBtn.disabled = false;
          }
          showError("Incorrect email address or password. Please try again.");
        }
      }, 1000);
    });
  }

  // ================================================================
  // GOOGLE SIGN-IN (simulated)
  // ================================================================
  function handleGoogleSignIn() {
    var useRealOAuth = (window.MAAHI_CONFIG && window.MAAHI_CONFIG.useRealGoogleOAuth) || (localStorage.getItem("maahi_use_real_google_oauth") === "true");
    if (useRealOAuth && window.maahiSupabase && window.maahiSupabase.isConnected()) {
      var target;
      if (currentRole === "admin") {
        target = window.location.origin + window.location.pathname.replace("login.html", "owner/dashboard.html");
      } else {
        target = window.location.origin + window.location.pathname.replace("login.html", "index.html");
      }
      window.maahiSupabase.signInWithGoogle(target)
        .catch(function (err) {
          console.warn("Real Google OAuth redirect failed, using simulation:", err);
          openSimulatedGoogleOAuthModal();
        });
    } else {
      openSimulatedGoogleOAuthModal();
    }
  }

  function openSimulatedGoogleOAuthModal() {
    if (!oauthModal || !accountsList) return;

    accountsList.style.display = "flex";
    if (customForm) customForm.style.display = "none";

    var accounts;
    if (currentRole === "admin") {
      accounts = [
        { name: "Maahi Admin", role: "Administrator", email: "admin@maahiproducts.com" },
        { name: "Maahi Contractor", role: "Contractor", email: "contractor@maahiproducts.com" }
      ];
    } else {
      accounts = [
        { name: "Maahi Customer", email: "consumer@gmail.com", addresses: [] },
        { name: "Harsh Vardhan", email: "harsh@gmail.com", addresses: [] },
        { name: "Guest Grower", email: "guest@gmail.com", addresses: [] }
      ];
    }

    var html = "";
    accounts.forEach(function (acc) {
      var initial = acc.name.charAt(0).toUpperCase();
      html += '<div class="google-account-row" data-email="' + acc.email + '" style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 0.5rem; cursor:pointer; border-bottom:1px solid #f1f3f4; transition:background 0.15s ease;">';
      html += '  <div style="width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, ' + (currentRole === "admin" ? "var(--admin-accent), var(--admin-gold)" : "var(--accent), var(--gold)") + '); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.95rem;">' + initial + '</div>';
      html += '  <div style="flex:1; min-width:0; text-align:left;">';
      html += '    <strong style="display:block; font-size:0.88rem; color:#3c4043; line-height:1.2;">' + acc.name + '</strong>';
      html += '    <span style="font-size:0.78rem; color:#5f6368; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + acc.email + '</span>';
      html += '  </div>';
      html += '</div>';
    });

    html += '<div id="btn-google-use-another" style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 0.5rem; cursor:pointer; transition:background 0.15s ease; color:#1a73e8; font-weight:600; font-size:0.88rem; border-top:1px solid #dadce0;">';
    html += '  <div style="width:32px; height:32px; border-radius:50%; border:1px solid #dadce0; display:flex; align-items:center; justify-content:center; font-size:1.2rem; color:#5f6368; background:#fff;">+</div>';
    html += '  <span>Use another account</span>';
    html += '</div>';

    accountsList.innerHTML = html;

    // Bind row clicks
    var rows = accountsList.querySelectorAll(".google-account-row");
    rows.forEach(function (row) {
      row.addEventListener("mouseenter", function () { row.style.background = "#f8f9fa"; });
      row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
      row.addEventListener("click", function () {
        var email = row.getAttribute("data-email");
        var selectedAcc = accounts.filter(function (a) { return a.email === email; })[0];

        if (selectedAcc) {
          row.style.opacity = "0.5";
          row.style.pointerEvents = "none";

          setTimeout(function () {
            if (currentRole === "admin") {
              var token = "maahi_google_token_" + Math.random().toString(36).substring(2);
              var rememberCheckbox = document.getElementById("admin-remember");
              var remember = rememberCheckbox ? rememberCheckbox.checked : false;

              if (remember) {
                localStorage.setItem(AUTH_KEY, token);
                localStorage.setItem("maahi_user_profile", JSON.stringify(selectedAcc));
                sessionStorage.removeItem(AUTH_KEY);
                sessionStorage.removeItem("maahi_user_profile");
              } else {
                sessionStorage.setItem(AUTH_KEY, token);
                sessionStorage.setItem("maahi_user_profile", JSON.stringify(selectedAcc));
                localStorage.removeItem(AUTH_KEY);
                localStorage.removeItem("maahi_user_profile");
              }

              oauthModal.style.opacity = "0";
              oauthModal.style.pointerEvents = "none";
              window.location.href = "owner/dashboard.html";
            } else {
              // Customer flow
              var oldProfile = null;
              try {
                var raw = localStorage.getItem(CONSUMER_KEY);
                if (raw) oldProfile = JSON.parse(raw);
              } catch(e) {}
              if (oldProfile && oldProfile.email === selectedAcc.email) {
                selectedAcc.addresses = oldProfile.addresses || [];
              }
              if (!selectedAcc.addresses) selectedAcc.addresses = [];

              localStorage.setItem(CONSUMER_KEY, JSON.stringify(selectedAcc));
              oauthModal.style.opacity = "0";
              oauthModal.style.pointerEvents = "none";
              window.location.href = redirectUrl || "index.html";
            }
          }, 800);
        }
      });
    });

    // "Use another account" button
    var useAnotherBtn = accountsList.querySelector("#btn-google-use-another");
    if (useAnotherBtn && customForm) {
      useAnotherBtn.addEventListener("mouseenter", function () { useAnotherBtn.style.background = "#f8f9fa"; });
      useAnotherBtn.addEventListener("mouseleave", function () { useAnotherBtn.style.background = "transparent"; });
      useAnotherBtn.addEventListener("click", function () {
        accountsList.style.display = "none";
        customForm.style.display = "flex";
        var nameInp = document.getElementById("google-custom-name");
        var emailInp = document.getElementById("google-custom-email");
        if (nameInp) nameInp.value = "";
        if (emailInp) emailInp.value = "";
      });
    }

    oauthModal.style.opacity = "1";
    oauthModal.style.pointerEvents = "auto";
  }

  if (googleBtn) {
    googleBtn.addEventListener("click", handleGoogleSignIn);
  }

  // Custom Google account form
  (function () {
    var submitBtn = document.getElementById("btn-google-custom-submit");
    var backBtn = document.getElementById("btn-google-custom-back");

    if (submitBtn) {
      submitBtn.addEventListener("click", function () {
        var nameInp = document.getElementById("google-custom-name");
        var emailInp = document.getElementById("google-custom-email");
        var name = nameInp ? nameInp.value.trim() : "";
        var email = emailInp ? emailInp.value.trim() : "";

        if (!name || !email) {
          alert("Please fill in both name and email.");
          return;
        }
        if (email.indexOf("@") === -1) {
          alert("Please enter a valid email address.");
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Signing In...";

        setTimeout(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Sign In";

          if (currentRole === "admin") {
            var role = "Contractor";
            if (email.toLowerCase().indexOf("admin") !== -1 || email.toLowerCase().indexOf("owner") !== -1) {
              role = "Administrator";
            }
            var adminAcc = { name: name, role: role, email: email };
            var token = "maahi_google_token_" + Math.random().toString(36).substring(2);
            var rememberCheckbox = document.getElementById("admin-remember");
            var remember = rememberCheckbox ? rememberCheckbox.checked : false;

            if (remember) {
              localStorage.setItem(AUTH_KEY, token);
              localStorage.setItem("maahi_user_profile", JSON.stringify(adminAcc));
              sessionStorage.removeItem(AUTH_KEY);
              sessionStorage.removeItem("maahi_user_profile");
            } else {
              sessionStorage.setItem(AUTH_KEY, token);
              sessionStorage.setItem("maahi_user_profile", JSON.stringify(adminAcc));
              localStorage.removeItem(AUTH_KEY);
              localStorage.removeItem("maahi_user_profile");
            }

            if (oauthModal) {
              oauthModal.style.opacity = "0";
              oauthModal.style.pointerEvents = "none";
            }
            window.location.href = "owner/dashboard.html";
          } else {
            var custAcc = { name: name, email: email, addresses: [] };
            var oldProfile = null;
            try {
              var raw = localStorage.getItem(CONSUMER_KEY);
              if (raw) oldProfile = JSON.parse(raw);
            } catch(e) {}
            if (oldProfile && oldProfile.email === custAcc.email) {
              custAcc.addresses = oldProfile.addresses || [];
            }

            localStorage.setItem(CONSUMER_KEY, JSON.stringify(custAcc));
            if (oauthModal) {
              oauthModal.style.opacity = "0";
              oauthModal.style.pointerEvents = "none";
            }
            window.location.href = redirectUrl || "index.html";
          }
        }, 1000);
      });
    }

    if (backBtn && accountsList && customForm) {
      backBtn.addEventListener("click", function () {
        customForm.style.display = "none";
        accountsList.style.display = "flex";
      });
    }
  })();

  // Close OAuth modal
  if (oauthClose) {
    oauthClose.addEventListener("click", function (e) {
      e.preventDefault();
      oauthModal.style.opacity = "0";
      oauthModal.style.pointerEvents = "none";
    });
  }

  if (oauthModal) {
    oauthModal.addEventListener("click", function (e) {
      if (e.target === oauthModal) {
        oauthModal.style.opacity = "0";
        oauthModal.style.pointerEvents = "none";
      }
    });
  }

  // ================================================================
  // Supabase Session Check
  // ================================================================
  if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
    window.maahiSupabase.getSession().then(function (res) {
      var session = res.data ? res.data.session : null;
      if (session && session.user) {
        var user = {
          name: session.user.user_metadata.full_name || session.user.email.split("@")[0],
          email: session.user.email,
          addresses: []
        };
        var oldProfile = null;
        try {
          var raw = localStorage.getItem(CONSUMER_KEY);
          if (raw) oldProfile = JSON.parse(raw);
        } catch(e) {}
        if (oldProfile && oldProfile.email === user.email) {
          user.addresses = oldProfile.addresses || [];
        }
        localStorage.setItem(CONSUMER_KEY, JSON.stringify(user));
        window.location.href = redirectUrl || "index.html";
      }
    }).catch(function (err) {
      console.warn("Failed to retrieve session from Supabase:", err);
    });

    window.maahiSupabase.onAuthStateChange(function (event, session) {
      if (session && session.user) {
        var user = {
          name: session.user.user_metadata.full_name || session.user.email.split("@")[0],
          email: session.user.email,
          addresses: []
        };
        var oldProfile = null;
        try {
          var raw = localStorage.getItem(CONSUMER_KEY);
          if (raw) oldProfile = JSON.parse(raw);
        } catch(e) {}
        if (oldProfile && oldProfile.email === user.email) {
          user.addresses = oldProfile.addresses || [];
        }
        localStorage.setItem(CONSUMER_KEY, JSON.stringify(user));
        window.location.href = redirectUrl || "index.html";
      }
    });
  }
})();
