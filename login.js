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

  function performRedirect() {
    var target = redirectUrl || "index.html";
    if (target.indexOf("#") === 0) {
      target = "index.html" + target;
    }
    window.location.href = target;
  }

  // ================================================================
  // Session Check — redirect immediately if already logged in
  // ================================================================
  if (currentRole === "customer" && localStorage.getItem(CONSUMER_KEY)) {
    performRedirect();
    return;
  }
  if (currentRole === "admin" && (sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY))) {
    window.location.href = "owner/dashboard.html";
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
      showError("Password reset is currently unavailable. Please contact support.");
    });
  }
  if (adminForgotLink) {
    adminForgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      showError("Password reset is currently unavailable. Please contact the administrator.");
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
          performRedirect();
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
        performRedirect();
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
          var token = "maahi_session_token_" + Math.random().toString(36).substring(2);
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
  // GOOGLE SIGN-IN
  // ================================================================
  function handleGoogleSignIn() {
    if (window.maahiSupabase && window.maahiSupabase.isConnected() && window.maahiSupabase.isHealthy()) {
      var target;
      if (currentRole === "admin") {
        target = window.location.origin + window.location.pathname.replace("login.html", "owner/dashboard.html");
      } else {
        target = window.location.origin + window.location.pathname.replace("login.html", "index.html");
      }
      window.maahiSupabase.signInWithGoogle(target)
        .catch(function (err) {
          console.error("Google OAuth redirect failed:", err);
          showError("Google Sign-In failed. Please try again or contact support.");
        });
    } else {
      showError("Sign-In is currently unavailable because the backend is disconnected.");
    }
  }

  if (googleBtn) {
    googleBtn.addEventListener("click", handleGoogleSignIn);
  }

  // ================================================================
  // Supabase Session Check
  // ================================================================
  if (window.maahiSupabase && window.maahiSupabase.isConnected()) {
    window.maahiSupabase.getSession().then(function (res) {
      var session = res.data ? res.data.session : null;
      if (session && session.user) {
        var email = session.user.email;
        var config = window.MAAHI_CONFIG || {};
        var adminEmail = config.adminEmail || "admin@maahiproducts.com";
        var contractorEmail = config.contractorEmail || "contractor@maahiproducts.com";
        
        var isAdminUser = (email === adminEmail || email === contractorEmail);
        
        if (isAdminUser || currentRole === "admin") {
          var role = "Contractor";
          if (email === adminEmail) {
            role = "Administrator";
          }
          var profile = {
            name: session.user.user_metadata.full_name || email.split("@")[0],
            role: role,
            email: email
          };
          sessionStorage.setItem(AUTH_KEY, session.access_token);
          sessionStorage.setItem("maahi_user_profile", JSON.stringify(profile));
          window.location.href = "owner/dashboard.html";
        } else {
          var user = {
            name: session.user.user_metadata.full_name || email.split("@")[0],
            email: email,
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
          performRedirect();
        }
      }
    }).catch(function (err) {
      console.warn("Failed to retrieve session from Supabase:", err);
    });

    window.maahiSupabase.onAuthStateChange(function (event, session) {
      if (session && session.user) {
        var email = session.user.email;
        var config = window.MAAHI_CONFIG || {};
        var adminEmail = config.adminEmail || "admin@maahiproducts.com";
        var contractorEmail = config.contractorEmail || "contractor@maahiproducts.com";
        
        var isAdminUser = (email === adminEmail || email === contractorEmail);
        
        if (isAdminUser || currentRole === "admin") {
          var role = "Contractor";
          if (email === adminEmail) {
            role = "Administrator";
          }
          var profile = {
            name: session.user.user_metadata.full_name || email.split("@")[0],
            role: role,
            email: email
          };
          sessionStorage.setItem(AUTH_KEY, session.access_token);
          sessionStorage.setItem("maahi_user_profile", JSON.stringify(profile));
          window.location.href = "owner/dashboard.html";
        } else {
          var user = {
            name: session.user.user_metadata.full_name || email.split("@")[0],
            email: email,
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
          performRedirect();
        }
      }
    });
  }
  window.maahiLoginInitialized = true;
})();
