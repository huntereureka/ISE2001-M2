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

const DATA_VERSION = "2";

const APP_STATE = {
  data: null
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
    persistData();
  } catch (err) {
    APP_STATE.data = { users: [], jobs: [], staffProfiles: [] };
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
    option.textContent = job.id + " — " + job.title + " (" + (job.location || "Location TBD") + ")";
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
    li.textContent =
      job.id +
      " — " +
      job.title +
      ", " +
      job.duration +
      "h (" +
      job.date +
      ") at " +
      (job.location || "Location TBD");
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
  alert(
    job.title +
      "\nDate: " +
      job.date +
      "\nLocation: " +
      job.location +
      "\nDuration: " +
      job.duration +
      "h\nDescription: " +
      job.description
  );
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
      option.textContent = job.id + " — " + job.title + " (" + formatDateLabel(job.date) + ")";
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
  if (!form) {
    return;
  }

  if (profile.preferenceNotes) {
    document.getElementById("preferenceTypes").value = profile.preferenceNotes.jobTypes || "";
    document.getElementById("preferenceLocations").value = profile.preferenceNotes.locations || "";
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const availabilityEntry = {
      week: document.getElementById("availabilityWeek").value,
      day: document.getElementById("availabilityDay").value,
      start: document.getElementById("availabilityStart").value,
      end: document.getElementById("availabilityEnd").value,
      notes: document.getElementById("availabilityNotes").value
    };

    if (!availabilityEntry.start || !availabilityEntry.end) {
      alert("Provide both start and end times.");
      return;
    }

    profile.availabilityEntries = profile.availabilityEntries || [];
    profile.availabilityEntries.push(availabilityEntry);
    profile.preferenceNotes = {
      jobTypes: document.getElementById("preferenceTypes").value,
      locations: document.getElementById("preferenceLocations").value
    };
    persistData();
    alert("Availability and preferences saved (UC9-UC11 main flow).");
  });

  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      form.reset();
    });
  }
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
    job.title +
    "</strong><br />- Date/Time: " +
    job.date +
    "<br />- Location: " +
    job.location +
    "<br />- Description: " +
    job.description +
    "<br />- Status: " +
    formatStatusLabel(job.status);
}

// ---------------------------------------------------------------------------
// Utility helpers

function formatDateLabel(dateStr) {
  if (!dateStr) {
    return "TBD";
  }
  return dateStr;
}
