import { GET_AUTH_API_URL } from "./env";
import { readAmazonAccessible, syncInterval, renderBadge } from "./shared";

document.addEventListener("DOMContentLoaded", function () {
  // Update UI based on current state
  renderBadge();
  renderSyncStatus();
  readAmazonAccessible().then((isAccessible) => {
    renderAmazonAuth(isAccessible);
  });
  chrome.storage.local.get("token").then((result) => {
    renderLogin(!!result.token);
  });

  // Hydrate
  document.getElementById("loginButton")?.addEventListener("click", submitLogin);
  document.getElementById("password")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      submitLogin();
    }
  });
  document.getElementById("logoutButton")?.addEventListener("click", () => {
    chrome.storage.local.remove("token", () => {
      renderLogin(false);
      renderBadge();
    });
  });

  // Add sync button handler
  document.getElementById("syncButton")?.addEventListener("click", async () => {
    const syncButton = document.getElementById("syncButton") as HTMLButtonElement;
    syncButton.disabled = true;
    syncButton.textContent = "Syncing...";

    try {
      await chrome.runtime.sendMessage({ type: "manualSync" });
      await renderSyncStatus(); // Update the sync times after successful sync
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      syncButton.disabled = false;
      syncButton.textContent = "Sync Now";
    }
  });
});

async function renderSyncStatus() {
  const lastSyncTimeElement = document.getElementById("lastSyncTime");
  const nextSyncTimeElement = document.getElementById("nextSyncTime");
  if (lastSyncTimeElement && nextSyncTimeElement) {
    const data = await chrome.storage.local.get(["lastSyncTime", "startedAt"]);
    const lastSyncTime = data.lastSyncTime ? new Date(data.lastSyncTime) : null;
    const startedAt = data.startedAt ? new Date(data.startedAt) : null;
    lastSyncTimeElement.innerHTML = lastSyncTime ? lastSyncTime.toLocaleString() : "Never";
    nextSyncTimeElement.innerHTML = lastSyncTime
      ? new Date(lastSyncTime.getTime() + syncInterval * 60 * 1000).toLocaleString()
      : startedAt
      ? new Date(startedAt.getTime() + syncInterval * 60 * 1000).toLocaleString()
      : "Unknown";
  } else {
    console.error("lastSyncTimeElement or nextSyncTimeElement not found");
  }
}

function renderAmazonAuth(isAccessible: boolean) {
  const amazonAuthStatus = document.getElementById("amazonAuthStatus");
  if (amazonAuthStatus) {
    amazonAuthStatus.innerHTML = isAccessible
      ? "ok"
      : 'got to <a href="https://read.amazon.com/notebook" target="_blank">https://read.amazon.com/notebook</a> and login';
  } else {
    console.error("amazonAuthStatus not found");
  }
}

function renderLogin(hasToken: boolean) {
  const loginForm = document.getElementById("loginForm");
  const loggedInContent = document.getElementById("loggedInContent");
  if (loginForm && loggedInContent) {
    loginForm.style.display = hasToken ? "none" : "block";
    loggedInContent.style.display = hasToken ? "block" : "none";
  } else {
    console.error("loginForm or loggedInContent not found");
  }
}

async function submitLogin() {
  const password = (document.getElementById("password") as HTMLInputElement).value;
  if (!password) {
    console.error("password not found");
    return;
  }
  try {
    const response = await fetch(GET_AUTH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      const { token } = await response.json();
      chrome.storage.local.set({ token }, () => {
        renderLogin(true);
        renderBadge();
      });
    }
  } catch (error) {
    console.error("Login error:", error);
  }
}
