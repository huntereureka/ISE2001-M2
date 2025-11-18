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

const DATA_VERSION = "3";

const APP_STATE = {
  data: null,
  adminUi: {
    mode: "add",
    selectedUsername: null
  },
  staffUi: {
    currentProfileId: null,
    selectedWeek: null,
    editingAvailabilityId: null
  }
};

document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

async function initializeApp() {
  await ensureDataLoaded();
  setupLanguageControls();

  const sessionUser = getSessionUser();
  const pageRole = document.body ? document.body.getAttribute("data-role") : null;

  if (pageRole === "login") {
    setupLogin(sessionUser);
  } else {
    protectPage(pageRole, sessionUser);
  }

  updateSessionDisplay(sessionUser);
  setupLogout();

  if (pageRole === "manager" && sessionUser && sessionUser.role === "manager") {
    setupManagerPage();
  }

  if (pageRole === "staff" && sessionUser && sessionUser.role === "staff") {
    setupStaffPage(sessionUser);
  }

  if (pageRole === "admin" && sessionUser && sessionUser.role === "admin") {
    setupAdminPage();
  }
}

// ---------------------------------------------------------------------------
// Data helpers

async function ensureDataLoaded() {
  if (APP_STATE.data && !dataNeedsBootstrap(APP_STATE.data)) {
    return APP_STATE.data;
  }

  const stored = window.localStorage.getItem("appData");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (!dataNeedsBootstrap(parsed)) {
        APP_STATE.data = parsed;
        APP_STATE.data.version = DATA_VERSION;
        persistData();
        return APP_STATE.data;
      }
      window.localStorage.removeItem("appData");
    } catch (err) {
      window.localStorage.removeItem("appData");
    }
  }

  try {
    const text = await fetchDataFromFile();
    APP_STATE.data = JSON.parse(text);
    APP_STATE.data.version = DATA_VERSION;
    persistData();
  } catch (err) {
    APP_STATE.data = { version: DATA_VERSION, users: [], jobs: [], staffProfiles: [] };
  }

  return APP_STATE.data;
}

async function fetchDataFromFile() {
  const response = await fetch("data.txt");
  if (!response.ok) {
    throw new Error("Failed to load data.txt");
  }
  return response.text();
}

function persistData() {
  if (APP_STATE.data) {
    APP_STATE.data.version = DATA_VERSION;
    window.localStorage.setItem("appData", JSON.stringify(APP_STATE.data));
  }
}

function dataNeedsBootstrap(data) {
  if (!data || typeof data !== "object") {
    return true;
  }

  if (data.version !== DATA_VERSION) {
    return true;
  }

  if (!Array.isArray(data.users) || !Array.isArray(data.jobs) || !Array.isArray(data.staffProfiles)) {
    return true;
  }

  const staffAProfile = data.staffProfiles.find(function (profile) {
    return profile.id === "staffA";
  });
  if (!staffAProfile) {
    return true;
  }

  const staffUser = data.users.find(function (user) {
    return user.username === "user" || user.username === "staff";
  });
  if (!staffUser || !staffUser.profileId) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Session helpers

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
  const map = {
    staff: "staff.html",
    manager: "manager.html",
    admin: "admin.html"
  };
  const path = map[role] || "login.html";
  window.location.href = path;
}

function getStaffProfileForSession(sessionUser) {
  if (!sessionUser) {
    return null;
  }

  if (sessionUser.role === "staff" && !sessionUser.profileId) {
    const fallback = (APP_STATE.data.staffProfiles || []).find(function (profile) {
      return profile.id === "staffA";
    });
    if (fallback) {
      sessionUser.profileId = fallback.id;
      setSessionUser(sessionUser);
    }
  }

  if (!sessionUser.profileId) {
    return null;
  }

  return (
    (APP_STATE.data.staffProfiles || []).find(function (profile) {
      return profile.id === sessionUser.profileId;
    }) || null
  );
}

function updateSessionDisplay(sessionUser) {
  const roleTag = document.getElementById("roleTag");
  if (!roleTag) {
    return;
  }

  if (!sessionUser) {
    roleTag.textContent = UI_STRINGS.en.roleTagLogin;
    return;
  }

  const roleLabel = sessionUser.role
    ? sessionUser.role.charAt(0).toUpperCase() + sessionUser.role.slice(1)
    : "User";
  roleTag.textContent = "Logged in as " + roleLabel;
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
  }
}

// ---------------------------------------------------------------------------
// Language helpers

function setupLanguageControls() {
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
}

function applyLanguage(langCode) {
  const dict = UI_STRINGS[langCode] || UI_STRINGS.en;

  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
}

// ---------------------------------------------------------------------------
// Login / Logout

function setupLogin(sessionUser) {
  if (sessionUser) {
    redirectToRole(sessionUser.role);
    return;
  }

  const form = document.getElementById("loginForm");
  const messageEl = document.getElementById("loginMessage");
  if (!form) {
    return;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const username = (form.username.value || "").trim().toLowerCase();
    const password = (form.password.value || "").trim();

    const record = (APP_STATE.data.users || []).find(function (user) {
      return user.username === username;
    });

    if (record && record.password === password) {
      const payload = {
        username: record.username,
        role: record.role,
        profileId: record.profileId || null
      };
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

// ---------------------------------------------------------------------------
// Manager page interactions

function setupManagerPage() {
  renderWorkloadTable();
  renderJobSelects();
  renderUnassignedJobs();
  renderStaffOptions();
  setupStaffCompareListeners();

  const jobModeSelect = document.getElementById("jobModeSelect");
  const jobSubmitBtn = document.getElementById("jobSubmitBtn");
  const jobDeleteBtn = document.getElementById("jobDeleteBtn");
  const jobCancelBtn = document.getElementById("jobCancelBtn");
  const jobSelect = document.getElementById("jobSelect");
  const allocateBtn = document.getElementById("allocateJobBtn");
  const skipBtn = document.getElementById("skipAvailabilityBtn");

  if (jobModeSelect) {
    jobModeSelect.addEventListener("change", function () {
      toggleJobSelectState(this.value === "edit");
    });
    toggleJobSelectState(jobModeSelect.value === "edit");
  }

  if (jobSelect) {
    jobSelect.addEventListener("change", function () {
      loadJobIntoForm(this.value);
    });
  }

  if (jobSubmitBtn) {
    jobSubmitBtn.addEventListener("click", function (event) {
      event.preventDefault();
      handleJobSubmit();
    });
  }

  if (jobDeleteBtn) {
    jobDeleteBtn.addEventListener("click", function (event) {
      event.preventDefault();
      handleJobDelete();
    });
  }

  if (jobCancelBtn) {
    jobCancelBtn.addEventListener("click", function (event) {
      event.preventDefault();
      clearJobForm();
      if (jobSelect) {
        jobSelect.value = "";
      }
      if (jobModeSelect) {
        jobModeSelect.value = "create";
        toggleJobSelectState(false);
      }
    });
  }

  if (allocateBtn) {
    allocateBtn.addEventListener("click", function (event) {
      event.preventDefault();
      handleJobAllocation();
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", function (event) {
      event.preventDefault();
      alert("Allocation recorded without availability check. (UC5 Alternative 4a)");
    });
  }
}

function renderWorkloadTable() {
  const tbody = document.getElementById("workloadTableBody");
  if (!tbody) {
    return;
  }

  const staffList = APP_STATE.data.staffProfiles || [];
  if (!staffList.length) {
    tbody.innerHTML = '<tr><td colspan="4">No staff data available.</td></tr>';
    return;
  }

  const jobs = APP_STATE.data.jobs || [];
  tbody.innerHTML = "";

  staffList.forEach(function (staff) {
    const assignedJobs = jobs.filter(function (job) {
      return job.assignedTo === staff.id && job.status !== "unassigned";
    });
    const workloadStatus = getWorkloadStatus(staff);
    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" +
      staff.name +
      "</td><td>" +
      staff.workloadHours +
      "</td><td>" +
      assignedJobs.length +
      '</td><td><span class="status-pill ' +
      workloadStatus.className +
      '">' +
      workloadStatus.label +
      "</span></td>";
    tbody.appendChild(row);
  });

  refreshStaffCompareSummaries();
}

function getWorkloadStatus(staff) {
  const ratio = staff.workloadCap ? staff.workloadHours / staff.workloadCap : 0;
  if (ratio >= 0.9) {
    return { label: "High", className: "status-pill--alert" };
  }
  if (ratio <= 0.4) {
    return { label: "Low", className: "status-pill--calm" };
  }
  return { label: "Balanced", className: "" };
}

function toggleJobSelectState(isEditMode) {
  const jobSelect = document.getElementById("jobSelect");
  if (!jobSelect) {
    return;
  }
  jobSelect.disabled = !isEditMode;
  if (!isEditMode) {
    jobSelect.value = "";
    clearJobForm();
  }
}

function loadJobIntoForm(jobId) {
  if (!jobId) {
    clearJobForm();
    return;
  }

  const job = (APP_STATE.data.jobs || []).find(function (item) {
    return item.id === jobId;
  });
  if (!job) {
    alert("Selected job could not be found.");
    clearJobForm();
    return;
  }

  document.getElementById("jobTitleInput").value = job.title || "";
  document.getElementById("jobDateInput").value = job.date || "";
  document.getElementById("jobDurationInput").value = job.duration || "";
  document.getElementById("jobLocationInput").value = job.location || "";
  document.getElementById("jobDescriptionInput").value = job.description || "";
}

function clearJobForm() {
  document.getElementById("jobTitleInput").value = "";
  document.getElementById("jobDateInput").value = "";
  document.getElementById("jobDurationInput").value = "";
  document.getElementById("jobLocationInput").value = "";
  document.getElementById("jobDescriptionInput").value = "";
}

function getJobFormValues() {
  const title = document.getElementById("jobTitleInput").value.trim();
  const date = document.getElementById("jobDateInput").value.trim();
  const durationRaw = document.getElementById("jobDurationInput").value.trim();
  const location = document.getElementById("jobLocationInput").value.trim();
  const description = document.getElementById("jobDescriptionInput").value.trim();

  if (!title || !date || !durationRaw) {
    alert("Please fill in the job title, date, and duration to proceed.");
    return null;
  }

  const duration = Number(durationRaw);
  if (Number.isNaN(duration) || duration <= 0) {
    alert("Duration must be a positive number of hours.");
    return null;
  }

  return {
    title: title,
    date: date,
    duration: duration,
    location: location,
    description: description
  };
}

function handleJobSubmit() {
  const jobModeSelect = document.getElementById("jobModeSelect");
  const jobSelect = document.getElementById("jobSelect");
  if (!jobModeSelect) {
    return;
  }

  const values = getJobFormValues();
  if (!values) {
    return;
  }

  if (jobModeSelect.value === "edit") {
    const jobId = jobSelect ? jobSelect.value : "";
    if (!jobId) {
      alert("Select a job to edit before submitting.");
      return;
    }
    updateJob(jobId, values);
  } else {
    createJob(values);
  }
}

function createJob(values) {
  const jobs = APP_STATE.data.jobs || [];
  const newJob = {
    id: generateJobId(),
    title: values.title,
    date: values.date,
    duration: values.duration,
    location: values.location,
    description: values.description,
    status: "unassigned",
    assignedTo: null
  };
  jobs.push(newJob);
  APP_STATE.data.jobs = jobs;
  persistData();
  renderJobSelects();
  renderUnassignedJobs();
  alert("Job created successfully (UC3 main flow).");
  clearJobForm();
}

function updateJob(jobId, values) {
  const jobs = APP_STATE.data.jobs || [];
  const job = jobs.find(function (item) {
    return item.id === jobId;
  });
  if (!job) {
    alert("The selected job no longer exists.");
    return;
  }

  job.title = values.title;
  job.date = values.date;
  job.duration = values.duration;
  job.location = values.location;
  job.description = values.description;
  persistData();
  renderJobSelects();
  renderUnassignedJobs();
  alert("Job updated successfully (UC4 main flow).");
}

function handleJobDelete() {
  const jobModeSelect = document.getElementById("jobModeSelect");
  const jobSelect = document.getElementById("jobSelect");
  if (!jobModeSelect || jobModeSelect.value !== "edit" || !jobSelect || !jobSelect.value) {
    alert("Select a job to delete while in edit mode.");
    return;
  }

  if (!window.confirm("Delete the selected job?")) {
    return;
  }

  const job = (APP_STATE.data.jobs || []).find(function (item) {
    return item.id === jobSelect.value;
  });
  if (job && job.assignedTo) {
    updateStaffWorkloadHours(job.assignedTo, -job.duration);
  }

  APP_STATE.data.jobs = (APP_STATE.data.jobs || []).filter(function (item) {
    return item.id !== jobSelect.value;
  });
  persistData();
  renderJobSelects();
  renderUnassignedJobs();
  renderWorkloadTable();
  jobSelect.value = "";
  clearJobForm();
  alert("Job deleted successfully (UC4 alternative 3a).");
}

function generateJobId() {
  const jobs = APP_STATE.data.jobs || [];
  const numbers = jobs
    .map(function (job) {
      const digits = parseInt(job.id.replace(/\D/g, ""), 10);
      return Number.isNaN(digits) ? 0 : digits;
    })
    .concat(0);
  const nextNumber = Math.max.apply(null, numbers) + 1;
  return "JOB-" + nextNumber;
}

function renderJobSelects() {
  const jobSelect = document.getElementById("jobSelect");
  const allocationSelect = document.getElementById("allocationJobSelect");
  const jobs = APP_STATE.data.jobs || [];

  if (jobSelect) {
    populateJobSelect(jobSelect, jobs, function () {
      return true;
    });
  }
  if (allocationSelect) {
    populateJobSelect(allocationSelect, jobs, function (job) {
      return job.status === "unassigned";
    });
  }
}

function populateJobSelect(selectEl, jobs, filterFn) {
  const previousValue = selectEl.value;
  selectEl.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a job";
  selectEl.appendChild(placeholder);

  jobs.filter(filterFn).forEach(function (job) {
    const option = document.createElement("option");
    option.value = job.id;
    option.textContent = formatJobLabel(job);
    selectEl.appendChild(option);
  });

  if (previousValue) {
    selectEl.value = previousValue;
  }
}

function renderUnassignedJobs() {
  const list = document.getElementById("unassignedJobs");
  if (!list) {
    return;
  }

  const jobs = (APP_STATE.data.jobs || []).filter(function (job) {
    return job.status === "unassigned";
  });

  if (!jobs.length) {
    list.innerHTML = "<li>No unassigned jobs for the current week.</li>";
    return;
  }

  list.innerHTML = "";
  jobs.forEach(function (job) {
    const li = document.createElement("li");
    li.textContent = formatJobLabel(job);
    list.appendChild(li);
  });
}

function renderStaffOptions() {
  const staffList = APP_STATE.data.staffProfiles || [];
  const staffSelects = document.querySelectorAll(".staff-compare");
  staffSelects.forEach(function (select) {
    populateStaffSelect(select, staffList);
  });

  const allocateSelect = document.getElementById("allocateStaffSelect");
  if (allocateSelect) {
    populateStaffSelect(allocateSelect, staffList);
  }

  refreshStaffCompareSummaries();
}

function populateStaffSelect(selectEl, staffList) {
  if (!selectEl) {
    return;
  }
  const previousValue = selectEl.value;
  selectEl.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select staff";
  selectEl.appendChild(placeholder);

  staffList.forEach(function (staff) {
    const option = document.createElement("option");
    option.value = staff.id;
    option.textContent = staff.name + (staff.eligible ? "" : " (not eligible)");
    selectEl.appendChild(option);
  });

  if (previousValue) {
    selectEl.value = previousValue;
  }
}

function setupStaffCompareListeners() {
  const selects = document.querySelectorAll(".staff-compare");
  selects.forEach(function (select) {
    select.addEventListener("change", function () {
      const index = this.getAttribute("data-summary") || "0";
      updateStaffSummary(index, this.value);
    });
  });
}

function updateStaffSummary(index, staffId) {
  const box = document.querySelector('.staff-summary[data-summary="' + index + '"]');
  if (!box) {
    return;
  }

  if (!staffId) {
    box.textContent = "Select a staff member to view availability details.";
    return;
  }

  const staff = (APP_STATE.data.staffProfiles || []).find(function (item) {
    return item.id === staffId;
  });

  if (!staff) {
    box.textContent = "Staff profile not available.";
    return;
  }

  box.innerHTML =
    "<strong>" +
    staff.name +
    "</strong><br />" +
    "- Weekly hours: " +
    staff.workloadHours +
    " / " +
    staff.workloadCap +
    "<br />" +
    "- Preferences: " +
    staff.preferences +
    "<br />" +
    "- Location: " +
    staff.location +
    "<br />" +
    "- Availability: " +
    staff.availability +
    (staff.eligible ? "" : "<br /><em>Currently not eligible for allocation.</em>");
}

function refreshStaffCompareSummaries() {
  const selects = document.querySelectorAll(".staff-compare");
  selects.forEach(function (select) {
    const idx = select.getAttribute("data-summary") || "0";
    const value = select.value || "";
    updateStaffSummary(idx, value);
  });
}

function handleJobAllocation() {
  const jobSelect = document.getElementById("allocationJobSelect");
  const staffSelect = document.getElementById("allocateStaffSelect");
  if (!jobSelect || !staffSelect) {
    return;
  }

  const jobId = jobSelect.value;
  const staffId = staffSelect.value;

  if (!jobId) {
    alert("Select a job to allocate (UC5 alternative 7b).");
    return;
  }
  if (!staffId) {
    alert("Select at least one staff member before submitting (UC5 alternative 7b).");
    return;
  }

  const job = (APP_STATE.data.jobs || []).find(function (item) {
    return item.id === jobId;
  });
  if (!job) {
    alert("Job not found.");
    return;
  }
  if (job.status !== "unassigned") {
    alert("This job is already being handled.");
    return;
  }

  const staff = (APP_STATE.data.staffProfiles || []).find(function (item) {
    return item.id === staffId;
  });
  if (!staff) {
    alert("Staff profile not found.");
    return;
  }
  if (!staff.eligible) {
    alert("Selected staff is not eligible for this job (UC5 alternative 7a).");
    return;
  }

  job.status = "assigned";
  job.assignedTo = staff.id;
  updateStaffWorkloadHours(staff.id, job.duration);

  persistData();
  renderJobSelects();
  renderUnassignedJobs();
  renderWorkloadTable();
  alert("Job allocated to " + staff.name + " (UC5 main flow).");
}

function updateStaffWorkloadHours(staffId, delta) {
  const staff = (APP_STATE.data.staffProfiles || []).find(function (item) {
    return item.id === staffId;
  });
  if (!staff) {
    return;
  }
  const nextValue = Number(staff.workloadHours || 0) + Number(delta || 0);
  staff.workloadHours = Math.max(nextValue, 0);
}

const DAY_SEQUENCE = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function dayIndex(day) {
  const idx = DAY_SEQUENCE.indexOf(day);
  return idx === -1 ? DAY_SEQUENCE.length : idx;
}

function ensureAvailabilityEntryIds(profile) {
  if (!Array.isArray(profile.availabilityEntries)) {
    profile.availabilityEntries = [];
  }

  profile.availabilityEntries.forEach(function (entry) {
    if (!entry.entryId) {
      entry.entryId = generateId("avail");
    }
  });
}

function ensurePreferenceEntries(profile) {
  if (!Array.isArray(profile.preferenceEntries)) {
    profile.preferenceEntries = [];
  }

  if (!profile.preferenceEntries.length && profile.preferenceNotes) {
    profile.preferenceEntries.push({
      entryId: generateId("pref"),
      week: profile.preferenceNotes.week || "Week of 01-07",
      jobTypes: profile.preferenceNotes.jobTypes || "",
      locations: profile.preferenceNotes.locations || "",
      updatedAt: new Date().toISOString()
    });
  }

  profile.preferenceEntries.forEach(function (entry) {
    if (!entry.entryId) {
      entry.entryId = generateId("pref");
    }
  });

  if (profile.preferenceNotes) {
    delete profile.preferenceNotes;
  }
}

function getAvailabilityEntriesForWeek(profile, week) {
  return (profile.availabilityEntries || []).filter(function (entry) {
    return entry.week === week;
  });
}

function sortAvailabilityEntries(entries) {
  return entries.slice().sort(function (a, b) {
    const dayDiff = dayIndex(a.day) - dayIndex(b.day);
    if (dayDiff !== 0) {
      return dayDiff;
    }
    const startDiff = parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start);
    if (!Number.isNaN(startDiff) && startDiff !== 0) {
      return startDiff;
    }
    return (a.start || "").localeCompare(b.start || "");
  });
}

function parseTimeToMinutes(value) {
  if (!value) {
    return NaN;
  }
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    return NaN;
  }
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function hasAvailabilityOverlap(profile, candidate, ignoreEntryId) {
  const candidateStart = parseTimeToMinutes(candidate.start);
  const candidateEnd = parseTimeToMinutes(candidate.end);

  return (profile.availabilityEntries || []).some(function (entry) {
    if (entry.week !== candidate.week || entry.day !== candidate.day) {
      return false;
    }
    if (ignoreEntryId && entry.entryId === ignoreEntryId) {
      return false;
    }

    const existingStart = parseTimeToMinutes(entry.start);
    const existingEnd = parseTimeToMinutes(entry.end);
    if (Number.isNaN(existingStart) || Number.isNaN(existingEnd)) {
      return false;
    }

    return Math.max(candidateStart, existingStart) < Math.min(candidateEnd, existingEnd);
  });
}

function getPreferenceEntryForWeek(profile, week) {
  if (!Array.isArray(profile.preferenceEntries)) {
    return null;
  }
  return (
    profile.preferenceEntries.find(function (entry) {
      return entry.week === week;
    }) || null
  );
}

function savePreferenceForWeek(profile, week, jobTypes, locations) {
  profile.preferenceEntries = profile.preferenceEntries || [];
  let entry = getPreferenceEntryForWeek(profile, week);
  if (!entry) {
    entry = {
      entryId: generateId("pref"),
      week: week,
      jobTypes: "",
      locations: ""
    };
    profile.preferenceEntries.push(entry);
  }

  entry.jobTypes = jobTypes;
  entry.locations = locations;
  entry.updatedAt = new Date().toISOString();
}

function generateId(prefix) {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// ---------------------------------------------------------------------------
// Staff page interactions

function setupStaffPage(sessionUser) {
  const profile = getStaffProfileForSession(sessionUser);
  if (!profile) {
    const tbody = document.getElementById("staffAssignmentsBody");
    const breakdown = document.getElementById("monthlyBreakdown");
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5">Staff profile unavailable.</td></tr>';
    }
    if (breakdown) {
      breakdown.textContent = "Unable to load workload summary for this staff.";
    }
    return;
  }

  ensureAvailabilityEntryIds(profile);
  ensurePreferenceEntries(profile);
  APP_STATE.staffUi = APP_STATE.staffUi || {};
  APP_STATE.staffUi.currentProfileId = profile.id;
  APP_STATE.staffUi.selectedWeek = null;
  APP_STATE.staffUi.editingAvailabilityId = null;

  renderStaffAssignments(profile);
  renderMonthlySummary(profile);
  setupAssignmentActions(profile);
  setupMonthlySelector(profile);
  setupAvailabilityForm(profile);
  setupRejectForm(profile);
}

function renderStaffAssignments(profile) {
  const tbody = document.getElementById("staffAssignmentsBody");
  if (!tbody) {
    return;
  }

  const assignments = (APP_STATE.data.jobs || []).filter(function (job) {
    return job.assignedTo === profile.id && job.status !== "unassigned";
  });

  if (!assignments.length) {
    tbody.innerHTML = '<tr><td colspan="5">No assignments for this week.</td></tr>';
    populateRejectSelect([]);
    return;
  }

  tbody.innerHTML = "";
  assignments.forEach(function (job) {
    const row = document.createElement("tr");
    row.innerHTML =
      "<td>" +
      formatDateLabel(job.date) +
      "</td><td>" +
      job.title +
      "</td><td>" +
      job.duration +
      '</td><td><span class="status-pill ' +
      getAssignmentStatusClass(job.status) +
      '">' +
      formatStatusLabel(job.status) +
      '</span></td><td class="actions">' +
      '<button class="btn btn-secondary" data-action="view" data-job-id="' +
      job.id +
      '">View</button> ' +
      (job.status === "assigned"
        ? '<button class="btn" data-action="accept" data-job-id="' + job.id + '">Accept</button> '
        : "") +
      '<button class="btn btn-danger" data-action="reject" data-job-id="' +
      job.id +
      '">Reject</button>' +
      "</td>";
    tbody.appendChild(row);
  });

  populateRejectSelect(assignments);
}

function setupAssignmentActions(profile) {
  const tbody = document.getElementById("staffAssignmentsBody");
  if (!tbody) {
    return;
  }

  tbody.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    const jobId = button.getAttribute("data-job-id");
    const action = button.getAttribute("data-action");
    if (!jobId) {
      return;
    }

    if (action === "view") {
      showJobDetails(jobId);
    } else if (action === "accept") {
      handleJobAcceptance(jobId, profile);
    } else if (action === "reject") {
      const rejectSelect = document.getElementById("rejectJobSelect");
      if (rejectSelect) {
        rejectSelect.value = jobId;
        updateRejectDetails(jobId);
        document.getElementById("rejectForm").scrollIntoView({ behavior: "smooth" });
      }
    }
  });
}

function showJobDetails(jobId) {
  const job = (APP_STATE.data.jobs || []).find(function (item) {
    return item.id === jobId;
  });
  if (!job) {
    alert("Job not found.");
    return;
  }
  let message = formatJobLabel(job) + "\nDuration: " + (job.duration || "?") + "h";
  if (job.description) {
    message += "\nDetails: " + job.description;
  }
  alert(message);
}

function handleJobAcceptance(jobId, profile) {
  const job = (APP_STATE.data.jobs || []).find(function (item) {
    return item.id === jobId;
  });
  if (!job || job.assignedTo !== profile.id) {
    alert("This assignment is no longer available.");
    return;
  }
  if (job.status !== "assigned") {
    alert("This assignment has already been processed.");
    return;
  }

  job.status = "accepted";
  persistData();
  renderStaffAssignments(profile);
  alert("Assignment accepted. (UC7 main flow)");
}

function getAssignmentStatusClass(status) {
  if (status === "accepted") {
    return "status-pill--calm";
  }
  if (status === "assigned") {
    return "";
  }
  return "status-pill--alert";
}

function formatStatusLabel(status) {
  if (!status) {
    return "Assigned";
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function populateRejectSelect(assignments) {
  const select = document.getElementById("rejectJobSelect");
  if (!select) {
    return;
  }

  const currentValue = select.value;
  select.innerHTML = '<option value="">Select a job</option>';

  assignments
    .filter(function (job) {
      return job.status === "assigned" || job.status === "accepted";
    })
    .forEach(function (job) {
      const option = document.createElement("option");
      option.value = job.id;
      option.textContent = formatJobLabel(job);
      select.appendChild(option);
    });

  select.value = currentValue;
  updateRejectDetails(select.value || "");
}

function setupMonthlySelector(profile) {
  const monthSelect = document.getElementById("monthSelect");
  if (!monthSelect) {
    return;
  }
  monthSelect.addEventListener("change", function () {
    renderMonthlySummary(profile);
  });
}

function renderMonthlySummary(profile) {
  const monthSelect = document.getElementById("monthSelect");
  const totalInput = document.getElementById("monthlyTotalInput");
  const breakdownBox = document.getElementById("monthlyBreakdown");
  if (!monthSelect || !totalInput || !breakdownBox) {
    return;
  }

  const selectedMonth = monthSelect.value;
  const data = (profile.monthlyWorkload || {})[selectedMonth];
  if (!data) {
    totalInput.value = "0 hrs";
    breakdownBox.textContent = "No workload data for " + selectedMonth + ".";
    return;
  }

  totalInput.value = (data.totalHours || 0) + " hrs";
  breakdownBox.innerHTML = data.weeks
    .map(function (week) {
      return "- " + week.label + ": " + week.hours + " hrs";
    })
    .join("<br />");
}

function setupAvailabilityForm(profile) {
  const form = document.getElementById("availabilityForm");
  const cancelBtn = document.getElementById("availabilityCancelBtn");
  const weekSelect = document.getElementById("availabilityWeek");
  const modeSelect = document.getElementById("availabilityMode");
  const daySelect = document.getElementById("availabilityDay");
  const startInput = document.getElementById("availabilityStart");
  const endInput = document.getElementById("availabilityEnd");
  const notesInput = document.getElementById("availabilityNotes");
  const prefTypesInput = document.getElementById("preferenceTypes");
  const prefLocationsInput = document.getElementById("preferenceLocations");
  const statusBox = document.getElementById("availabilityStatus");
  const listContainer = document.getElementById("availabilityList");
  const preferenceSummary = document.getElementById("preferenceSummary");

  if (
    !form ||
    !weekSelect ||
    !modeSelect ||
    !daySelect ||
    !startInput ||
    !endInput ||
    !prefTypesInput ||
    !prefLocationsInput ||
    !statusBox ||
    !listContainer ||
    !preferenceSummary
  ) {
    return;
  }

  const allowedWeeks = Array.from(weekSelect.options).map(function (option) {
    return option.value;
  });

  function setStatus(message, state) {
    statusBox.textContent = message || "";
    statusBox.classList.remove("form-status--ok", "form-status--error");
    if (!message) {
      return;
    }
    if (state === "ok") {
      statusBox.classList.add("form-status--ok");
    } else if (state === "error") {
      statusBox.classList.add("form-status--error");
    }
  }

  function clearAvailabilityInputs() {
    startInput.value = "";
    endInput.value = "";
    notesInput.value = "";
    APP_STATE.staffUi.editingAvailabilityId = null;
  }

  function renderAvailabilityListForWeek() {
    const week = weekSelect.value;
    const entries = sortAvailabilityEntries(getAvailabilityEntriesForWeek(profile, week));
    if (!entries.length) {
      listContainer.textContent = "No availability saved for this week.";
      return;
    }

    listContainer.innerHTML = "";
    entries.forEach(function (entry) {
      const row = document.createElement("div");
      row.className = "list-item";

      const text = document.createElement("div");
      const label =
        "<strong>" +
        escapeHtml(entry.day || "Day") +
        "</strong> · " +
        escapeHtml(entry.start || "?") +
        " - " +
        escapeHtml(entry.end || "?");
      const note = entry.notes ? ' <span class="hint">' + escapeHtml(entry.notes) + "</span>" : "";
      text.innerHTML = label + note;

      const actions = document.createElement("div");
      actions.className = "list-item-actions";
      const loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "btn btn-xs";
      loadBtn.dataset.availabilityAction = "load";
      loadBtn.dataset.entryId = entry.entryId;
      loadBtn.textContent = "Load";
      actions.appendChild(loadBtn);

      row.appendChild(text);
      row.appendChild(actions);
      listContainer.appendChild(row);
    });
  }

  function renderPreferenceSummaryBox() {
    const week = weekSelect.value;
    const entry = getPreferenceEntryForWeek(profile, week);
    if (!entry || (!entry.jobTypes && !entry.locations)) {
      preferenceSummary.textContent = "No preference saved for this week.";
      return;
    }

    const types = entry.jobTypes || "Not specified";
    const locations = entry.locations || "Not specified";
    preferenceSummary.innerHTML =
      "<strong>Preferred Job Types:</strong> " +
      escapeHtml(types) +
      "<br /><strong>Preferred Routes:</strong> " +
      escapeHtml(locations);
  }

  function loadPreferenceInputsForWeek() {
    const entry = getPreferenceEntryForWeek(profile, weekSelect.value);
    prefTypesInput.value = entry ? entry.jobTypes || "" : "";
    prefLocationsInput.value = entry ? entry.locations || "" : "";
  }

  function refreshWeekContext() {
    APP_STATE.staffUi.selectedWeek = weekSelect.value;
    APP_STATE.staffUi.editingAvailabilityId = null;
    renderAvailabilityListForWeek();
    renderPreferenceSummaryBox();
    if (modeSelect.value === "Indicate Job Preference") {
      loadPreferenceInputsForWeek();
      setStatus("Updating preferences for " + weekSelect.value + ".", null);
    } else if (modeSelect.value === "Edit Availability") {
      setStatus("Select a saved availability entry to edit.", null);
    } else {
      setStatus("", null);
    }
  }

  listContainer.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-availability-action]");
    if (!button) {
      return;
    }
    const entryId = button.getAttribute("data-entry-id");
    if (!entryId) {
      return;
    }
    const entry = (profile.availabilityEntries || []).find(function (item) {
      return item.entryId === entryId;
    });
    if (!entry) {
      return;
    }

    APP_STATE.staffUi.editingAvailabilityId = entry.entryId;
    weekSelect.value = entry.week;
    APP_STATE.staffUi.selectedWeek = entry.week;
    daySelect.value = entry.day || daySelect.value;
    startInput.value = entry.start || "";
    endInput.value = entry.end || "";
    notesInput.value = entry.notes || "";
    modeSelect.value = "Edit Availability";
    renderAvailabilityListForWeek();
    renderPreferenceSummaryBox();
    if (modeSelect.value === "Indicate Job Preference") {
      loadPreferenceInputsForWeek();
    }
    setStatus("Loaded availability entry for editing.", null);
  });

  weekSelect.addEventListener("change", function () {
    refreshWeekContext();
  });

  modeSelect.addEventListener("change", function () {
    APP_STATE.staffUi.editingAvailabilityId = null;
    if (modeSelect.value === "Indicate Job Preference") {
      loadPreferenceInputsForWeek();
      setStatus("Updating preferences for " + weekSelect.value + ".", null);
    } else if (modeSelect.value === "Edit Availability") {
      setStatus("Select a saved availability entry to edit.", null);
    } else {
      setStatus("", null);
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const mode = modeSelect.value;
    const week = weekSelect.value;
    if (allowedWeeks.indexOf(week) === -1) {
      setStatus("Select a week within the planning window.", "error");
      return;
    }

    if (mode === "Indicate Job Preference") {
      const jobTypes = prefTypesInput.value.trim();
      const locations = prefLocationsInput.value.trim();
      if (!jobTypes && !locations) {
        setStatus("Enter at least one preference detail.", "error");
        return;
      }
      savePreferenceForWeek(profile, week, jobTypes, locations);
      persistData();
      renderPreferenceSummaryBox();
      setStatus("Preferences saved for " + week + ".", "ok");
      return;
    }

    const day = daySelect.value;
    const start = startInput.value.trim();
    const end = endInput.value.trim();
    const notes = notesInput.value.trim();
    if (!day || !start || !end) {
      setStatus("Provide day, start time, and end time.", "error");
      return;
    }

    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);
    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) {
      setStatus("Use 24-hour HH:MM format for times.", "error");
      return;
    }
    if (endMinutes <= startMinutes) {
      setStatus("End time must be later than start time.", "error");
      return;
    }

    if (mode === "Edit Availability" && !APP_STATE.staffUi.editingAvailabilityId) {
      setStatus("Select an existing entry from the list before editing.", "error");
      return;
    }

    const candidate = {
      week: week,
      day: day,
      start: start,
      end: end,
      notes: notes
    };

    const ignoreId = APP_STATE.staffUi.editingAvailabilityId || null;
    if (hasAvailabilityOverlap(profile, candidate, ignoreId)) {
      setStatus("This availability overlaps with an existing entry.", "error");
      return;
    }

    if (mode === "Add Availability") {
      candidate.entryId = generateId("avail");
      profile.availabilityEntries.push(candidate);
      setStatus("Availability added for " + day + " (" + week + ").", "ok");
      clearAvailabilityInputs();
    } else {
      const target = (profile.availabilityEntries || []).find(function (entry) {
        return entry.entryId === APP_STATE.staffUi.editingAvailabilityId;
      });
      if (!target) {
        setStatus("Entry no longer available for editing. Reload the list.", "error");
        return;
      }
      target.week = week;
      target.day = day;
      target.start = start;
      target.end = end;
      target.notes = notes;
      target.updatedAt = new Date().toISOString();
      APP_STATE.staffUi.editingAvailabilityId = null;
      setStatus("Availability updated for " + day + " (" + week + ").", "ok");
    }

    persistData();
    renderAvailabilityListForWeek();
  });

  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      form.reset();
      if (APP_STATE.staffUi.selectedWeek) {
        weekSelect.value = APP_STATE.staffUi.selectedWeek;
      }
      renderAvailabilityListForWeek();
      renderPreferenceSummaryBox();
      if (modeSelect.value === "Indicate Job Preference") {
        loadPreferenceInputsForWeek();
      }
      APP_STATE.staffUi.editingAvailabilityId = null;
      setStatus("Form cleared.", null);
    });
  }

  refreshWeekContext();
}

function setupRejectForm(profile) {
  const form = document.getElementById("rejectForm");
  const select = document.getElementById("rejectJobSelect");
  const cancelBtn = document.getElementById("rejectCancelBtn");
  if (!form || !select) {
    return;
  }

  select.addEventListener("change", function () {
    updateRejectDetails(this.value);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const jobId = select.value;
    const reason = document.getElementById("rejectReasonInput").value;
    if (!jobId) {
      alert("Select a job to reject.");
      return;
    }
    if (!window.confirm("Confirm that you have already spoken with your manager.")) {
      return;
    }

    const job = (APP_STATE.data.jobs || []).find(function (item) {
      return item.id === jobId;
    });
    if (!job || job.assignedTo !== profile.id) {
      alert("Job not available.");
      return;
    }

    updateStaffWorkloadHours(profile.id, -job.duration);
    job.status = "unassigned";
    job.assignedTo = null;
    job.rejectionReason = reason || "";
    persistData();

    renderStaffAssignments(profile);
    renderMonthlySummary(profile);
    select.value = "";
    document.getElementById("rejectReasonInput").value = "";
    updateRejectDetails("");
    alert("Assignment rejected (UC12 main flow).");
  });

  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      select.value = "";
      document.getElementById("rejectReasonInput").value = "";
      updateRejectDetails("");
    });
  }
}

function updateRejectDetails(jobId) {
  const box = document.getElementById("rejectJobDetails");
  if (!box) {
    return;
  }

  if (!jobId) {
    box.textContent = "Select a job to view its details.";
    return;
  }

  const job = (APP_STATE.data.jobs || []).find(function (item) {
    return item.id === jobId;
  });
  if (!job) {
    box.textContent = "Job not found.";
    return;
  }

  box.innerHTML =
    "<strong>" +
    formatJobLabel(job) +
    "</strong><br />- Duration: " +
    (job.duration || "?") +
    "h<br />- Route Notes: " +
    (job.description || "No additional notes.") +
    "<br />- Status: " +
    formatStatusLabel(job.status);
}

// ---------------------------------------------------------------------------
// Admin helpers (UC13 / UC14)

function setupAdminPage() {
  const tableBody = document.getElementById("userTableBody");
  const form = document.getElementById("userForm");
  if (!tableBody || !form) {
    return;
  }

  if (!APP_STATE.adminUi) {
    APP_STATE.adminUi = { mode: "add", selectedUsername: null };
  }

  renderAdminUserTable();
  resetAdminForm();

  tableBody.addEventListener("click", handleAdminTableClick);
  form.addEventListener("submit", handleAdminFormSubmit);

  const cancelBtn = document.getElementById("userCancelButton");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      if (APP_STATE.adminUi.mode === "edit" && APP_STATE.adminUi.selectedUsername) {
        loadAdminUserIntoForm(APP_STATE.adminUi.selectedUsername);
      } else {
        resetAdminForm();
      }
    });
  }

  const newBtn = document.getElementById("userNewButton");
  if (newBtn) {
    newBtn.addEventListener("click", function () {
      resetAdminForm();
    });
  }

  const deleteBtn = document.getElementById("userDeleteButton");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", handleAdminDelete);
  }
}

function handleAdminTableClick(event) {
  const row = event.target.closest("tr[data-username]");
  if (!row) {
    return;
  }
  const username = row.getAttribute("data-username");
  if (username) {
    loadAdminUserIntoForm(username);
  }
}

function renderAdminUserTable() {
  const tableBody = document.getElementById("userTableBody");
  if (!tableBody) {
    return;
  }

  const users = Array.isArray(APP_STATE.data && APP_STATE.data.users)
    ? APP_STATE.data.users.slice()
    : [];

  if (users.length === 0) {
    tableBody.innerHTML =
      '<tr class="table-empty"><td colspan="5">No users found.</td></tr>';
    return;
  }

  users.sort(function (a, b) {
    const left = (a.name || a.username || "").toLowerCase();
    const right = (b.name || b.username || "").toLowerCase();
    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  });

  const rows = users
    .map(function (user) {
      const statusText = user.status === "inactive" ? "Inactive" : "Active";
      const statusClass =
        user.status === "inactive" ? "status-pill status-pill--alert" : "status-pill status-pill--calm";
      return (
        '<tr data-username="' +
        escapeHtml(user.username || "") +
        '"><td>' +
        escapeHtml(user.name || "(no name)") +
        '<div class="hint">@' +
        escapeHtml(user.username || "unknown") +
        "</div></td><td>" +
        escapeHtml(user.email || "not provided") +
        "</td><td>" +
        escapeHtml(formatRoleLabel(user.role)) +
        "</td><td>" +
        escapeHtml(user.department || "-") +
        "</td><td><span class=\"" +
        statusClass +
        '">' +
        statusText +
        "</span></td></tr>"
      );
    })
    .join("\n");

  tableBody.innerHTML = rows;
  highlightAdminSelectedRow(APP_STATE.adminUi.selectedUsername);
}

function highlightAdminSelectedRow(username) {
  const tableBody = document.getElementById("userTableBody");
  if (!tableBody) {
    return;
  }

  Array.prototype.forEach.call(tableBody.querySelectorAll("tr"), function (row) {
    row.classList.remove("is-selected");
    if (username && row.getAttribute("data-username") === username) {
      row.classList.add("is-selected");
    }
  });
}

function resetAdminForm() {
  const form = document.getElementById("userForm");
  if (!form) {
    return;
  }

  form.reset();
  APP_STATE.adminUi.mode = "add";
  APP_STATE.adminUi.selectedUsername = null;
  setAdminFormStatus("Enter details for the new user.", null);

  const modeLabel = document.getElementById("userModeLabel");
  if (modeLabel) {
    modeLabel.value = "Add new user";
  }

  const statusSelect = document.getElementById("userStatusSelect");
  if (statusSelect) {
    statusSelect.value = "active";
  }

  const passwordInput = document.getElementById("userPasswordInput");
  if (passwordInput) {
    passwordInput.value = "";
    passwordInput.placeholder = "required when adding";
  }

  const selectedInput = document.getElementById("userSelectedUsername");
  if (selectedInput) {
    selectedInput.value = "";
  }

  const deleteBtn = document.getElementById("userDeleteButton");
  if (deleteBtn) {
    deleteBtn.disabled = true;
  }

  highlightAdminSelectedRow(null);
}

function loadAdminUserIntoForm(username) {
  const form = document.getElementById("userForm");
  if (!form) {
    return;
  }

  const user = findUserRecord(username);
  if (!user) {
    setAdminFormStatus("User not found. Refresh the table.", "error");
    resetAdminForm();
    return;
  }

  APP_STATE.adminUi.mode = "edit";
  APP_STATE.adminUi.selectedUsername = user.username;

  const modeLabel = document.getElementById("userModeLabel");
  if (modeLabel) {
    modeLabel.value = "Editing @" + (user.username || "");
  }

  document.getElementById("userNameInput").value = user.name || "";
  document.getElementById("userEmailInput").value = user.email || "";
  document.getElementById("userUsernameInput").value = user.username || "";
  document.getElementById("userDeptInput").value = user.department || "";
  document.getElementById("userRoleSelect").value = user.role || "staff";
  document.getElementById("userStatusSelect").value = user.status === "inactive" ? "inactive" : "active";
  document.getElementById("userNotesInput").value = user.notes || "";

  const passwordInput = document.getElementById("userPasswordInput");
  if (passwordInput) {
    passwordInput.value = "";
    passwordInput.placeholder = "Leave blank to keep current password";
  }

  const selectedInput = document.getElementById("userSelectedUsername");
  if (selectedInput) {
    selectedInput.value = user.username || "";
  }

  const deleteBtn = document.getElementById("userDeleteButton");
  if (deleteBtn) {
    deleteBtn.disabled = false;
  }

  highlightAdminSelectedRow(user.username || "");
  setAdminFormStatus("Editing user " + (user.username || ""), null);
}

function handleAdminFormSubmit(event) {
  event.preventDefault();

  const mode = APP_STATE.adminUi.mode === "edit" ? "edit" : "add";
  const currentUsername = APP_STATE.adminUi.selectedUsername || null;

  const validation = validateAdminUserInput(collectAdminFormData(), mode, currentUsername);
  if (!validation.ok) {
    setAdminFormStatus(validation.message, "error");
    return;
  }

  try {
    const sanitized = validation.data;
    let resultingUsername;
    if (mode === "add") {
      resultingUsername = addAdminUser(sanitized);
    } else {
      resultingUsername = updateAdminUser(currentUsername, sanitized);
    }
    persistData();
    renderAdminUserTable();
    loadAdminUserIntoForm(resultingUsername);
    setAdminFormStatus(
      mode === "add" ? "User added successfully." : "User updated successfully.",
      "ok"
    );
  } catch (err) {
    console.error("Failed to save user", err);
    setAdminFormStatus("System error while saving user. Please try again.", "error");
  }
}

function handleAdminDelete() {
  const username = APP_STATE.adminUi.selectedUsername;
  if (!username) {
    setAdminFormStatus("Select a user before deleting.", "error");
    return;
  }

  if (!window.confirm("Delete user @" + username + "? This action cannot be undone.")) {
    return;
  }

  if (!deleteAdminUser(username)) {
    setAdminFormStatus("Unable to delete user. Please refresh and try again.", "error");
    return;
  }

  persistData();
  renderAdminUserTable();
  resetAdminForm();
  setAdminFormStatus("User deleted successfully.", "ok");
}

function collectAdminFormData() {
  const nameInput = document.getElementById("userNameInput");
  const emailInput = document.getElementById("userEmailInput");
  const usernameInput = document.getElementById("userUsernameInput");
  const passwordInput = document.getElementById("userPasswordInput");
  const roleSelect = document.getElementById("userRoleSelect");
  const deptInput = document.getElementById("userDeptInput");
  const notesInput = document.getElementById("userNotesInput");
  const statusSelect = document.getElementById("userStatusSelect");

  return {
    name: (nameInput && nameInput.value ? nameInput.value : "").trim(),
    email: (emailInput && emailInput.value ? emailInput.value : "").trim(),
    username: (usernameInput && usernameInput.value ? usernameInput.value : "").trim(),
    password: passwordInput && passwordInput.value ? passwordInput.value : "",
    role: roleSelect && roleSelect.value ? roleSelect.value : "staff",
    department: (deptInput && deptInput.value ? deptInput.value : "").trim(),
    notes: (notesInput && notesInput.value ? notesInput.value : "").trim(),
    status: statusSelect && statusSelect.value ? statusSelect.value : "active"
  };
}

function validateAdminUserInput(formData, mode, currentUsername) {
  const sanitized = {
    name: formData.name,
    email: (formData.email || "").trim(),
    username: formData.username,
    password: formData.password.trim(),
    role: formData.role,
    department: formData.department,
    notes: formData.notes,
    status: formData.status === "inactive" ? "inactive" : "active"
  };

  if (!sanitized.name || !sanitized.email || !sanitized.username || !sanitized.role || !sanitized.department) {
    return { ok: false, message: "All required fields (name, email, username, role, department) must be filled." };
  }

  const namePattern = /^[A-Za-z][A-Za-z\s'.-]*$/;
  if (!namePattern.test(sanitized.name)) {
    return { ok: false, message: "Name should only contain letters, spaces, apostrophes, or hyphens." };
  }

  const normalizedEmail = sanitized.email.toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(sanitized.email)) {
    return { ok: false, message: "Provide a valid email address." };
  }

  if (mode === "add" && sanitized.password.length < 4) {
    return { ok: false, message: "Password must be at least 4 characters for new users." };
  }

  const users = Array.isArray(APP_STATE.data && APP_STATE.data.users)
    ? APP_STATE.data.users
    : [];
  const normalizedCurrent = currentUsername ? currentUsername.toLowerCase() : null;

  const usernameConflict = users.some(function (user) {
    if (!user.username) {
      return false;
    }
    const normalized = user.username.toLowerCase();
    if (normalizedCurrent && normalized === normalizedCurrent) {
      return false;
    }
    return normalized === sanitized.username.toLowerCase();
  });
  if (usernameConflict) {
    return { ok: false, message: "Username already exists. Choose another username." };
  }

  const emailConflict = users.some(function (user) {
    if (!user.email) {
      return false;
    }
    if (normalizedCurrent && user.username && user.username.toLowerCase() === normalizedCurrent) {
      return false;
    }
    return user.email.toLowerCase() === normalizedEmail;
  });
  if (emailConflict) {
    return { ok: false, message: "Email already exists. Provide a different email address." };
  }

  return { ok: true, data: sanitized };
}

function addAdminUser(data) {
  if (!APP_STATE.data.users) {
    APP_STATE.data.users = [];
  }
  const record = {
    username: data.username,
    password: data.password,
    role: data.role,
    name: data.name,
    email: data.email,
    department: data.department,
    status: data.status,
    notes: data.notes,
    createdAt: new Date().toISOString()
  };
  APP_STATE.data.users.push(record);
  APP_STATE.adminUi.mode = "edit";
  APP_STATE.adminUi.selectedUsername = record.username;
  return record.username;
}

function updateAdminUser(originalUsername, data) {
  const user = findUserRecord(originalUsername);
  if (!user) {
    throw new Error("User not found");
  }

  user.name = data.name;
  user.email = data.email;
  user.department = data.department;
  user.role = data.role;
  user.status = data.status;
  user.notes = data.notes;
  if (data.password) {
    user.password = data.password;
  }
  const normalizedOriginal = originalUsername ? originalUsername.toLowerCase() : null;
  if (!normalizedOriginal || normalizedOriginal !== data.username.toLowerCase()) {
    user.username = data.username;
    APP_STATE.adminUi.selectedUsername = data.username;
  }
  user.updatedAt = new Date().toISOString();
  APP_STATE.adminUi.mode = "edit";
  return user.username;
}

function deleteAdminUser(username) {
  if (!username || !APP_STATE.data || !Array.isArray(APP_STATE.data.users)) {
    return false;
  }

  const normalized = username.toLowerCase();
  const users = APP_STATE.data.users;
  const index = users.findIndex(function (user) {
    return (user.username || "").toLowerCase() === normalized;
  });

  if (index < 0) {
    return false;
  }

  users.splice(index, 1);
  return true;
}

function findUserRecord(username) {
  if (!username) {
    return null;
  }
  const users = Array.isArray(APP_STATE.data && APP_STATE.data.users)
    ? APP_STATE.data.users
    : [];
  const normalized = username.toLowerCase();
  return (
    users.find(function (user) {
      return (user.username || "").toLowerCase() === normalized;
    }) || null
  );
}

function setAdminFormStatus(message, state) {
  const box = document.getElementById("userFormStatus");
  if (!box) {
    return;
  }

  box.textContent = message || "";
  box.classList.remove("form-status--ok", "form-status--error");
  if (!message) {
    return;
  }

  if (state === "ok") {
    box.classList.add("form-status--ok");
  } else if (state === "error") {
    box.classList.add("form-status--error");
  }
}

// ---------------------------------------------------------------------------
// Utility helpers

function formatDateLabel(dateStr) {
  if (!dateStr) {
    return "TBD";
  }
  return dateStr;
}

function formatRoleLabel(role) {
  switch (role) {
    case "manager":
      return "Manager";
    case "admin":
      return "Administrator";
    default:
      return "Staff";
  }
}

function formatJobLabel(job) {
  if (!job) {
    return "";
  }

  const title = job.title || "Route";
  const duration = job.duration ? job.duration + "h" : "";
  const date = job.date ? formatDateLabel(job.date) : "TBD";
  const parts = [job.id || "JOB", "—", title];
  if (duration) {
    parts.push(", ", duration);
  }
  parts.push(" (", date, ")");
  return parts.join("");
}

function escapeHtml(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).replace(/[&<>\"']/g, function (char) {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

