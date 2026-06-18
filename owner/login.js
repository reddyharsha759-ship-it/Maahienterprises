(function () {
  var AUTH_KEY = "maahi_owner_auth_token";
  
  var form = document.getElementById("login-form");
  var emailInput = document.getElementById("login-email");
  var passwordInput = document.getElementById("login-password");
  var rememberCheckbox = document.getElementById("login-remember");
  var submitBtn = document.getElementById("login-submit-btn");
  var errorAlert = document.getElementById("login-error");
  var errorMsg = document.getElementById("login-error-msg");
  var passwordToggle = document.getElementById("password-toggle");
  var eyeIcon = document.getElementById("eye-icon");
  var forgotLink = document.getElementById("forgot-link");

  // Check if already authenticated, if so, redirect immediately to dashboard
  if (sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY)) {
    window.location.href = "dashboard.html";
    return;
  }

  // Toggle password visibility
  if (passwordToggle && passwordInput && eyeIcon) {
    passwordToggle.addEventListener("click", function () {
      var isPressed = passwordToggle.getAttribute("aria-pressed") === "true";
      passwordToggle.setAttribute("aria-pressed", !isPressed ? "true" : "false");
      passwordToggle.setAttribute("aria-label", !isPressed ? "Hide password" : "Show password");
      
      passwordInput.type = !isPressed ? "text" : "password";
      
      // Update eye icon SVG paths
      if (!isPressed) {
        // Eye off / crossed eye icon path
        eyeIcon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-9.3 12.8l1.4-1.4 15.6-15.6 1.4 1.4L4.1 21.8l-1.4-1.4z"/>';
      } else {
        // Eye open icon path
        eyeIcon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
      }
    });
  }

  // Forgot password handler
  if (forgotLink) {
    forgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      showError("Password reset is disabled for the local demo. Please use the credentials listed below.");
    });
  }

  function showError(message) {
    if (!errorAlert || !errorMsg) return;
    
    // Clear and set message
    errorMsg.textContent = message;
    errorAlert.removeAttribute("hidden");
    
    // Trigger CSS shake animation by resetting it
    errorAlert.style.animation = "none";
    // Trigger reflow to restart animation
    errorAlert.offsetHeight; 
    errorAlert.style.animation = "";
  }

  function hideError() {
    if (errorAlert) {
      errorAlert.setAttribute("hidden", "true");
    }
  }

  function validateEmail(email) {
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  if (emailInput) {
    emailInput.addEventListener("input", hideError);
  }
  if (passwordInput) {
    passwordInput.addEventListener("input", hideError);
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError();

      var email = emailInput ? emailInput.value.trim() : "";
      var password = passwordInput ? passwordInput.value : "";
      var remember = rememberCheckbox ? rememberCheckbox.checked : false;

      // Basic field validations
      if (!email) {
        showError("Please enter your email address.");
        if (emailInput) emailInput.focus();
        return;
      }
      if (!validateEmail(email)) {
        showError("Please enter a valid email address.");
        if (emailInput) emailInput.focus();
        return;
      }
      if (!password) {
        showError("Please enter your password.");
        if (passwordInput) passwordInput.focus();
        return;
      }

      // Enter loading state
      if (submitBtn) {
        submitBtn.classList.add("is-loading");
        submitBtn.disabled = true;
      }

      // Simulate a network authentication call (1 second)
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
          
          if (remember) {
            localStorage.setItem(AUTH_KEY, token);
            localStorage.setItem("maahi_user_profile", JSON.stringify(userProfile));
          } else {
            sessionStorage.setItem(AUTH_KEY, token);
            sessionStorage.setItem("maahi_user_profile", JSON.stringify(userProfile));
          }
          
          // Clear any sessionStorage/localStorage differences to ensure clean state
          if (remember) {
            sessionStorage.removeItem(AUTH_KEY);
            sessionStorage.removeItem("maahi_user_profile");
          } else {
            localStorage.removeItem(AUTH_KEY);
            localStorage.removeItem("maahi_user_profile");
          }

          // Redirect to the dashboard
          window.location.href = "dashboard.html";
        } else {
          // Re-enable form
          if (submitBtn) {
            submitBtn.classList.remove("is-loading");
            submitBtn.disabled = false;
          }
          showError("Incorrect email address or password. Please try again.");
          if (passwordInput) {
            passwordInput.value = "";
            passwordInput.focus();
          }
        }
      }, 1000);
    });
  }

  // --- GOOGLE SIGN-IN & OAUTH INTEGRATION ---
  var googleBtn = document.getElementById("btn-google-login");
  var oauthModal = document.getElementById("google-oauth-modal");
  var oauthClose = document.getElementById("oauth-close");
  var accountsList = document.getElementById("google-accounts-list");
  var customForm = document.getElementById("google-custom-account-form");

  function handleGoogleSignIn() {
    var useRealOAuth = localStorage.getItem("maahi_use_real_google_oauth") === "true";
    if (useRealOAuth && window.maahiSupabase && window.maahiSupabase.isConnected()) {
      var redirectUrl = window.location.origin + window.location.pathname.replace("login.html", "dashboard.html");
      window.maahiSupabase.signInWithGoogle(redirectUrl)
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
    
    // Reset views
    accountsList.style.display = "flex";
    if (customForm) customForm.style.display = "none";
    
    var googleAccounts = [
      { name: "Maahi Admin", role: "Administrator", email: "admin@maahiproducts.com" },
      { name: "Maahi Contractor", role: "Contractor", email: "contractor@maahiproducts.com" }
    ];

    var html = "";
    googleAccounts.forEach(function (acc) {
      var initial = acc.name.split(" ")[1].charAt(0).toUpperCase();
      html += '<div class="google-account-row" data-email="' + acc.email + '" style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 0.5rem; cursor:pointer; border-bottom:1px solid #f1f3f4; transition:background 0.15s ease;">';
      html += '  <div style="width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, var(--accent), var(--gold)); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.95rem;">' + initial + '</div>';
      html += '  <div style="flex:1; min-width:0; text-align:left;">';
      html += '    <strong style="display:block; font-size:0.88rem; color:#3c4043; line-height:1.2;">' + acc.name + '</strong>';
      html += '    <span style="font-size:0.78rem; color:#5f6368; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + acc.email + '</span>';
      html += '  </div>';
      html += '</div>';
    });

    // Add "Use another account" button
    html += '<div id="btn-google-use-another" style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 0.5rem; cursor:pointer; transition:background 0.15s ease; color:#1a73e8; font-weight:600; font-size:0.88rem; border-top:1px solid #dadce0;">';
    html += '  <div style="width:32px; height:32px; border-radius:50%; border:1px solid #dadce0; display:flex; align-items:center; justify-content:center; font-size:1.2rem; color:#5f6368; background:#fff;">+</div>';
    html += '  <span>Use another account</span>';
    html += '</div>';

    accountsList.innerHTML = html;

    var rows = accountsList.querySelectorAll(".google-account-row");
    rows.forEach(function (row) {
      row.addEventListener("mouseenter", function () { row.style.background = "#f8f9fa"; });
      row.addEventListener("mouseleave", function () { row.style.background = "transparent"; });
      row.addEventListener("click", function () {
        var email = row.getAttribute("data-email");
        var selectedAcc = googleAccounts.filter(function (a) { return a.email === email; })[0];
        
        if (selectedAcc) {
          row.style.opacity = "0.5";
          row.style.pointerEvents = "none";
          
          setTimeout(function () {
            var token = "maahi_google_token_" + Math.random().toString(36).substring(2);
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
            window.location.href = "dashboard.html";
          }, 800);
        }
      });
    });

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

  // Bind Google custom entry form buttons
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

        // Determine role based on email or default to Contractor
        var role = "Contractor";
        if (email.toLowerCase().indexOf("admin") !== -1 || email.toLowerCase().indexOf("owner") !== -1) {
          role = "Administrator";
        }
        
        var selectedAcc = { name: name, role: role, email: email };
        submitBtn.disabled = true;
        submitBtn.textContent = "Signing In...";
        
        setTimeout(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Sign In";
          
          var token = "maahi_google_token_" + Math.random().toString(36).substring(2);
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

          if (oauthModal) {
            oauthModal.style.opacity = "0";
            oauthModal.style.pointerEvents = "none";
          }
          window.location.href = "dashboard.html";
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
})();
