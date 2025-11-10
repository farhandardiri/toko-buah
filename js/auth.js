// ==================== OAUTH MANAGEMENT ====================
let accessToken = null;
let isAuthenticated = false;

// Initialize OAuth
function initAuth() {
  const token = localStorage.getItem("gsheets_token");
  const expiry = localStorage.getItem("gsheets_token_expiry");

  if (token && expiry && new Date().getTime() < parseInt(expiry)) {
    accessToken = token;
    isAuthenticated = true;
    updateAuthUI(true);
  } else {
    // Clear expired tokens
    localStorage.removeItem("gsheets_token");
    localStorage.removeItem("gsheets_token_expiry");
    updateAuthUI(false);
  }

  // Check for OAuth callback
  handleOAuthCallback();
}

function handleOAuthCallback() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);

  const token = params.get("access_token");
  const expiresIn = params.get("expires_in");

  if (token) {
    // Save token
    accessToken = token;
    isAuthenticated = true;
    const expiryTime = new Date().getTime() + parseInt(expiresIn) * 1000;

    localStorage.setItem("gsheets_token", token);
    localStorage.setItem("gsheets_token_expiry", expiryTime.toString());

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);

    updateAuthUI(true);
    showAlert("Login berhasil!", "success");

    // Reload data after login
    if (typeof system !== "undefined") {
      system.loadAllData();
    }
  }
}

function updateAuthUI(loggedIn) {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const protectedSections = document.querySelectorAll(".protected-section");

  if (loggedIn) {
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "block";
    protectedSections.forEach((section) => {
      section.style.display = "block";
    });
  } else {
    if (loginBtn) loginBtn.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
    protectedSections.forEach((section) => {
      section.style.display = "none";
    });
  }
}

function login() {
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(
      window.location.origin + window.location.pathname
    )}&` +
    `response_type=token&` +
    `scope=${encodeURIComponent(SCOPES)}&` +
    `include_granted_scopes=true`;

  window.location.href = authUrl;
}

function logout() {
  if (accessToken) {
    // Try to revoke token
    fetch(
      `https://accounts.google.com/o/oauth2/revoke?token=${accessToken}`
    ).catch((err) => console.log("Token revoke error:", err));
  }

  localStorage.removeItem("gsheets_token");
  localStorage.removeItem("gsheets_token_expiry");
  accessToken = null;
  isAuthenticated = false;
  updateAuthUI(false);
  showAlert("Anda telah logout", "info");
}
