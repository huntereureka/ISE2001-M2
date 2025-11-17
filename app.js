// Shared UI strings (very small demo dictionary)
const UI_STRINGS = {
  en: {
    appTitle: "Workload Planning System",
    languageLabel: "Website Language",
    languageHint: "Select a language to update the interface text.",
    roleTagLogin: "Logged out / Login view",
    roleTagManager: "Logged in as Manager",
    roleTagStaff: "Logged in as Staff",
    roleTagAdmin: "Logged in as Administrator",
    loginHeading: "Login"
  },
  zh: {
    appTitle: "工作量规划系统",
    languageLabel: "网站语言",
    languageHint: "选择语言以更新界面文字。",
    roleTagLogin: "未登录 / 登录界面",
    roleTagManager: "已登录（经理）",
    roleTagStaff: "已登录（员工）",
    roleTagAdmin: "已登录（管理员）",
    loginHeading: "登录"
  },
  ms: {
    appTitle: "Sistem Perancangan Beban Kerja",
    languageLabel: "Bahasa Laman",
    languageHint: "Pilih bahasa untuk mengemas kini teks antara muka.",
    roleTagLogin: "Belum log masuk / Halaman log masuk",
    roleTagManager: "Log masuk sebagai Pengurus",
    roleTagStaff: "Log masuk sebagai Staf",
    roleTagAdmin: "Log masuk sebagai Pentadbir",
    loginHeading: "Log Masuk"
  },
  ta: {
    appTitle: "பணிச்சுமை திட்டமிடும் அமைப்பு",
    languageLabel: "இணையதள மொழி",
    languageHint: "இணைமுக உரையை மாற்ற மொழியைத் தேர்ந்தெடுக்கவும்.",
    roleTagLogin: "உள்நுழையவில்லை / உள்நுழைவு பக்கம்",
    roleTagManager: "மேலாளராக உள்நுழைந்துள்ளார்",
    roleTagStaff: "பணியாளராக உள்நுழைந்துள்ளார்",
    roleTagAdmin: "நிர்வாகியாக உள்நுழைந்துள்ளார்",
    loginHeading: "உள்நுழை"
  }
};

const ROLE_TO_PAGE = {
  staff: "staff.html",
  manager: "manager.html",
  admin: "admin.html"
};

const DEMO_USERS = {
  staff: { password: "staff", role: "staff" },
  manager: { password: "manager", role: "manager" },
  admin: { password: "admin", role: "admin" }
};

const ROLE_NAMES = {
  staff: "Staff",
  manager: "Manager",
  admin: "Administrator"
};

function applyLanguage(langCode) {
  const dict = UI_STRINGS[langCode] || UI_STRINGS.en;

  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
}

function getSessionUser() {
  try {
    const stored = window.localStorage.getItem("sessionUser");
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    return null;
  }
}

function setSessionUser(user) {
  window.localStorage.setItem("sessionUser", JSON.stringify(user));
}

function clearSessionUser() {
  window.localStorage.removeItem("sessionUser");
}

function redirectToRole(role) {
  const path = ROLE_TO_PAGE[role] || "login.html";
  window.location.href = path;
}

function updateSessionDisplay(sessionUser) {
  if (!sessionUser) {
    return;
  }
  const roleTag = document.getElementById("roleTag");
  if (roleTag) {
    const label = ROLE_NAMES[sessionUser.role] || sessionUser.role;
    roleTag.textContent = "Logged in as " + label;
  }
}

function protectPage(requiredRole, sessionUser) {
  if (!requiredRole || requiredRole === "login") {
    return;
  }

  if (!sessionUser) {
    window.location.href = "login.html";
    return;
  }

  if (sessionUser.role !== requiredRole) {
    redirectToRole(sessionUser.role);
    return;
  }

  updateSessionDisplay(sessionUser);
}

function setupLogin(sessionUser) {
  if (sessionUser) {
    redirectToRole(sessionUser.role);
    return;
  }

  const form = document.getElementById("loginForm");
  if (!form) {
    return;
  }

  const messageEl = document.getElementById("loginMessage");

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const username = (form.username.value || "").trim().toLowerCase();
    const password = (form.password.value || "").trim();
    const record = DEMO_USERS[username];

    if (record && record.password === password) {
      const payload = { username: username, role: record.role };
      setSessionUser(payload);
      if (messageEl) {
        messageEl.textContent = "";
      }
      redirectToRole(record.role);
      return;
    }

    if (messageEl) {
      messageEl.textContent = "Invalid username or password.";
    }
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById("logoutButton");
  if (!logoutBtn) {
    return;
  }

  logoutBtn.addEventListener("click", function () {
    clearSessionUser();
    window.location.href = "login.html";
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const select = document.getElementById("languageSelect");
  const savedLang = window.localStorage.getItem("uiLang") || "en";

  if (select) {
    select.value = savedLang;

    select.addEventListener("change", function () {
      const lang = this.value;
      window.localStorage.setItem("uiLang", lang);
      applyLanguage(lang);
      updateSessionDisplay(getSessionUser());
    });
  }

  applyLanguage(savedLang);

  const sessionUser = getSessionUser();
  const pageRole = document.body ? document.body.getAttribute("data-role") : null;

  if (pageRole === "login") {
    setupLogin(sessionUser);
  } else {
    protectPage(pageRole, sessionUser);
  }

  updateSessionDisplay(sessionUser);
  setupLogout();
});
