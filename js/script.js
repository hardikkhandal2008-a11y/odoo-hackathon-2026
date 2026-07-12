const API_BASE = "/api";
const TOKEN_KEY = "assetflow_token";
const USER_KEY = "assetflow_user";

document.addEventListener("DOMContentLoaded", () => {
  initializeApp().catch((error) => {
    console.error(error);
    alert(error.message || "Something went wrong while loading the page.");
  });
});

async function initializeApp() {
  highlightActiveMenu();
  bindLogoutLinks();
  bindBaseUiInteractions();

  const page = getCurrentPage();

  if (page === "index.html" || page === "") {
    if (getToken()) {
      window.location.href = "dashboard.html";
      return;
    }

    initializeLoginPage();
    return;
  }

  if (isFrontendOnlySession()) {
    updateDashboardWelcome(getStoredUser() || { full_name: "Demo User" });
    initializeStaticPageInteractions(page);
    return;
  }

  let user;

  try {
    user = await requireAuth();
    updateDashboardWelcome(user);
  } catch (error) {
    if (isNetworkError(error)) {
      enableFrontendOnlyMode(getStoredUser() || { full_name: "Demo User" });
      initializeStaticPageInteractions(page);
      return;
    }

    throw error;
  }

  switch (page) {
    case "dashboard.html":
      await initializeDashboardPage();
      break;
    case "organization.html":
      await initializeOrganizationPage();
      break;
    case "assets.html":
      await initializeAssetsPage();
      break;
    case "allocation.html":
      await initializeAllocationPage();
      break;
    case "booking.html":
      await initializeBookingPage();
      break;
    case "maintenance.html":
      await initializeMaintenancePage();
      break;
    case "audit.html":
      await initializeAuditPage();
      break;
    case "notifications.html":
      await initializeNotificationPage();
      break;
    case "reports.html":
      await initializeReportPage();
      break;
    default:
      break;
  }
}

function bindBaseUiInteractions() {
  const sidebar = document.querySelector(".sidebar");
  const toggle = document.querySelector(".menu-toggle");

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("show");
    });
  }
}

function getCurrentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function isFrontendOnlySession() {
  return getToken() === "frontend-demo-session";
}

function isNetworkError(error) {
  const message = error?.message || "";
  return message === "Failed to fetch" || message.includes("NetworkError");
}

function enableFrontendOnlyMode(user = { full_name: "Demo User" }) {
  localStorage.setItem(TOKEN_KEY, "frontend-demo-session");
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  updateDashboardWelcome(user);
}

async function requireAuth() {
  const token = getToken();

  if (!token) {
    redirectToLogin();
    throw new Error("Authentication required.");
  }

  try {
    const user = await apiFetch("/auth/me");
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch (error) {
    clearAuth();
    redirectToLogin();
    throw error;
  }
}

function redirectToLogin() {
  if (getCurrentPage() !== "index.html") {
    window.location.href = "index.html";
  }
}

async function apiFetch(endpoint, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    let message = "Request failed.";

    if (contentType.includes("application/json")) {
      const errorData = await response.json();
      message = errorData.message || message;
    } else {
      message = await response.text();
    }

    throw new Error(message);
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.blob();
}

async function downloadAuthenticatedFile(endpoint, fileName) {
  const blob = await apiFetch(endpoint, {
    method: "GET",
    headers: {}
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function highlightActiveMenu() {
  const currentPage = getCurrentPage();

  document.querySelectorAll(".menu a").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.parentElement.classList.add("active");
    }
  });
}

function bindLogoutLinks() {
  document.querySelectorAll('a[href="index.html"]').forEach((link) => {
    if (link.closest(".menu")) {
      link.addEventListener("click", async () => {
        try {
          if (getToken() && !isFrontendOnlySession()) {
            await apiFetch("/auth/logout", { method: "POST" });
          }
        } catch (error) {
          console.warn("Logout request failed:", error.message);
        } finally {
          clearAuth();
        }
      });
    }
  });

  window.logout = async () => {
    try {
      if (getToken() && !isFrontendOnlySession()) {
        await apiFetch("/auth/logout", { method: "POST" });
      }
    } catch (error) {
      console.warn("Logout request failed:", error.message);
    } finally {
      clearAuth();
      window.location.href = "index.html";
    }
  };
}

function updateDashboardWelcome(user) {
  const welcomeNode = document.querySelector(".user-info span");
  if (welcomeNode && user?.full_name) {
    welcomeNode.textContent = `Welcome, ${user.full_name}`;
  }
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = typeof value === "string" && value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB");
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

function statusClass(status) {
  const normalized = String(status || "").toLowerCase();

  if (["available", "active", "completed", "confirmed", "read"].includes(normalized)) {
    return "available";
  }

  if (["allocated", "temporary", "booked", "unread"].includes(normalized)) {
    return "allocated";
  }

  return "maintenance";
}

function renderStatus(status) {
  return `<span class="status ${statusClass(status)}">${escapeHtml(status)}</span>`;
}

function setCardValues(values) {
  const nodes = document.querySelectorAll(".cards .card p");
  values.forEach((value, index) => {
    if (nodes[index]) {
      nodes[index].textContent = value ?? 0;
    }
  });
}

function setSubmitButtonText(form, text) {
  const button = form.querySelector(".primary-btn");
  if (button) {
    button.textContent = text;
  }
}

function resetFormState(form, submitText) {
  form.reset();
  delete form.dataset.recordId;
  setSubmitButtonText(form, submitText);
}

function scrollToForm(form) {
  form.closest(".form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function populateSelect(select, options, config = {}) {
  const {
    placeholder = "Select an option",
    valueKey = "value",
    labelKey = "label"
  } = config;

  const currentValue = select.value;
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;

  options.forEach((option) => {
    const element = document.createElement("option");
    element.value = option[valueKey];
    element.textContent = option[labelKey];
    select.appendChild(element);
  });

  if ([...select.options].some((option) => option.value === currentValue)) {
    select.value = currentValue;
  }
}

function showRecordAlert(title, lines) {
  alert(`${title}\n\n${lines.join("\n")}`);
}

function getPageForm() {
  return document.querySelector(".form-section form");
}

function getTableBody() {
  return document.querySelector(".table-section tbody");
}

function topPrimaryButton() {
  return document.querySelector(".topbar .primary-btn");
}

function focusFirstField(form) {
  const field = form?.querySelector("input, select, textarea");
  if (field) {
    field.focus();
  }
}

function initializeStaticPageInteractions(page) {
  const form = getPageForm();
  const headerButton = topPrimaryButton();

  if (headerButton && form) {
    const submitButton = form.querySelector('button[type="submit"], .primary-btn');
    const defaultSubmitText = submitButton?.textContent?.trim() || "Save";

    headerButton.addEventListener("click", () => {
      resetFormState(form, defaultSubmitText);
      scrollToForm(form);
      focusFirstField(form);
    });
  }

  if (form && !form.dataset.staticBound) {
    form.dataset.staticBound = "true";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      scrollToForm(form);
      alert("Frontend demo mode is active. Start the backend to save data.");
    });
  }

  if (page === "dashboard.html") {
    updateDashboardWelcome(getStoredUser() || { full_name: "Demo User" });
  }
}

function initializeLoginPage() {
  const form = document.getElementById("loginForm");
  const signupButton = document.querySelector(".signup-btn");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const [emailInput, passwordInput] = form.querySelectorAll("input");
    const submitButton = form.querySelector('button[type="submit"]');
    const payload = {
      email: emailInput.value.trim(),
      password: passwordInput.value
    };

    submitButton.disabled = true;
    submitButton.textContent = "Logging in...";

    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setAuth(response.token, response.user);
      window.location.href = "dashboard.html";
    } catch (error) {
      // Keep frontend navigation usable when the API is temporarily unavailable.
      if (isNetworkError(error)) {
        enableFrontendOnlyMode({
          full_name: payload.email || "Demo User"
        });
        window.location.href = "dashboard.html";
        return;
      }

      alert(error.message || "Login failed.");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Login";
    }
  });

  signupButton?.addEventListener("click", async () => {
    const fullName = prompt("Enter full name");
    if (!fullName) return;

    const email = prompt("Enter email address");
    if (!email) return;

    const password = prompt("Create a password");
    if (!password) return;

    try {
      const response = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password })
      });

      setAuth(response.token, response.user);
      alert("Account created successfully. You are now logged in.");
      window.location.href = "dashboard.html";
    } catch (error) {
      alert(error.message || "Registration failed.");
    }
  });

  const forgotLink = document.querySelector(".forgot-password a");
  forgotLink?.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = prompt("Enter your account email to reset password");
    if (!email) return;

    try {
      const response = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
      });

      const resetToken = response.resetToken || prompt("Enter the reset token from your email");
      if (!resetToken) return;

      const password = prompt("Enter your new password");
      if (!password) return;

      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, password })
      });

      alert(response.message || "Password reset successful. You can now log in.");
    } catch (error) {
      alert(error.message || "Password reset failed.");
    }
  });

  const resetToken = new URLSearchParams(window.location.search).get("resetToken");
  if (resetToken) {
    const password = prompt("Enter your new password");
    if (password) {
      apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: resetToken, password })
      })
        .then(() => alert("Password reset successful. You can now log in."))
        .catch((error) => alert(error.message || "Password reset failed."));
    }
  }
}

async function initializeDashboardPage() {
  const [summary, activity] = await Promise.all([
    apiFetch("/dashboard/summary"),
    apiFetch("/dashboard/activity")
  ]);

  setCardValues([
    summary.availableAssets,
    summary.allocatedAssets,
    summary.availableResources,
    summary.activeBookings,
    summary.pendingTransfers,
    summary.upcomingReturns
  ]);

  const alertBox = document.querySelector(".alert-box span");
  if (alertBox) {
    alertBox.textContent = `${summary.overdueReturns || 0} assets overdue for return - Flagged for follow-up`;
  }

  const activityList = document.querySelector(".activity ul");
  if (activityList) {
    activityList.innerHTML = activity.length
      ? activity.map((item) => `<li>${escapeHtml(item.message)}</li>`).join("")
      : "<li>No recent activity found.</li>";
  }
}

async function initializeOrganizationPage() {
  const form = getPageForm();
  const tbody = getTableBody();
  const headerButton = topPrimaryButton();
  const [nameInput, codeInput, headInput] = form.querySelectorAll("input");
  const locationSelect = form.querySelector("select");
  const descriptionField = form.querySelector("textarea");

  headerButton?.addEventListener("click", () => {
    resetFormState(form, "Save Department");
    scrollToForm(form);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      name: nameInput.value.trim(),
      code: codeInput.value.trim(),
      head: headInput.value.trim(),
      location: locationSelect.value,
      description: descriptionField.value.trim()
    };

    if (form.dataset.recordId) {
      await apiFetch(`/departments/${form.dataset.recordId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await apiFetch("/departments", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    resetFormState(form, "Save Department");
    await loadOrganizationData();
  });

  tbody.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const rowId = button.dataset.id;
    const action = button.dataset.action;
    const departments = await apiFetch("/departments");
    const department = departments.find((item) => String(item.id) === rowId);

    if (!department) return;

    if (action === "edit") {
      nameInput.value = department.department_name;
      codeInput.value = department.department_code;
      headInput.value = department.department_head;
      locationSelect.value = department.location;
      descriptionField.value = department.description || "";
      form.dataset.recordId = department.id;
      setSubmitButtonText(form, "Update Department");
      scrollToForm(form);
    }

    if (action === "delete" && confirm(`Delete ${department.department_name}?`)) {
      await apiFetch(`/departments/${department.id}`, { method: "DELETE" });
      await loadOrganizationData();
    }
  });

  await loadOrganizationData();

  async function loadOrganizationData() {
    const [summary, departments] = await Promise.all([
      apiFetch("/departments/summary"),
      apiFetch("/departments")
    ]);

    setCardValues([
      summary.totalDepartments,
      summary.totalEmployees,
      summary.managers,
      summary.locations
    ]);

    tbody.innerHTML = departments.map((department) => `
      <tr>
        <td>${escapeHtml(department.department_code)}</td>
        <td>${escapeHtml(department.department_name)}</td>
        <td>${escapeHtml(department.department_head)}</td>
        <td>${escapeHtml(department.employee_count)}</td>
        <td>${escapeHtml(department.location)}</td>
        <td>${renderStatus(department.status)}</td>
        <td>
          <button data-action="edit" data-id="${department.id}">Edit</button>
          <button data-action="delete" data-id="${department.id}">Delete</button>
        </td>
      </tr>
    `).join("");
  }
}

async function initializeAssetsPage() {
  const tbody = getTableBody();
  const headerButton = topPrimaryButton();
  const searchPanel = document.querySelector(".search-panel");
  const [searchInput, categorySelect, statusSelect] = searchPanel.querySelectorAll("input, select");
  const searchButton = searchPanel.querySelector("button");

  headerButton?.addEventListener("click", async () => {
    const departments = await apiFetch("/departments");
    const payload = await promptAssetPayload(null, departments);
    if (!payload) return;

    await apiFetch("/assets", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    await loadAssetsData();
  });

  searchButton?.addEventListener("click", loadAssetsData);
  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      loadAssetsData();
    }
  });

  tbody.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const assetId = button.dataset.id;
    const action = button.dataset.action;
    const asset = await apiFetch(`/assets/${assetId}`);

    if (action === "edit") {
      const departments = await apiFetch("/departments");
      const payload = await promptAssetPayload(asset, departments);
      if (!payload) return;

      await apiFetch(`/assets/${asset.id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      await loadAssetsData();
    }

    if (action === "view") {
      showRecordAlert("Asset Details", [
        `Code: ${asset.asset_code}`,
        `Name: ${asset.name}`,
        `Category: ${asset.category}`,
        `Assigned To: ${asset.assigned_to}`,
        `Department: ${asset.department}`,
        `Status: ${asset.status}`,
        `Bookable: ${asset.is_bookable ? "Yes" : "No"}`,
        `Description: ${asset.description || "-"}`
      ]);
    }
  });

  await loadAssetsData();

  async function loadAssetsData() {
    const params = new URLSearchParams({
      search: searchInput.value.trim(),
      category: categorySelect.value,
      status: statusSelect.value
    });

    const [summary, assets] = await Promise.all([
      apiFetch("/assets/summary"),
      apiFetch(`/assets?${params.toString()}`)
    ]);

    setCardValues([
      summary.totalAssets,
      summary.available,
      summary.allocated,
      summary.maintenance,
      summary.retired
    ]);

    tbody.innerHTML = assets.map((asset) => `
      <tr>
        <td>${escapeHtml(asset.asset_code)}</td>
        <td>${escapeHtml(asset.name)}</td>
        <td>${escapeHtml(asset.category)}</td>
        <td>${escapeHtml(asset.assigned_to)}</td>
        <td>${renderStatus(asset.status)}</td>
        <td>${escapeHtml(asset.department)}</td>
        <td>
          <button data-action="edit" data-id="${asset.id}">Edit</button>
          <button data-action="view" data-id="${asset.id}">View</button>
        </td>
      </tr>
    `).join("");
  }
}

async function promptAssetPayload(existingAsset, departments) {
  const suggestedCode = existingAsset?.asset_code || "";
  const suggestedName = existingAsset?.name || "";
  const suggestedCategory = existingAsset?.category || "Laptop";
  const suggestedDepartment = existingAsset?.department || departments[0]?.department_name || "Store";
  const suggestedAssignedTo = existingAsset?.assigned_to || "Available";
  const suggestedStatus = existingAsset?.status || "Available";
  const suggestedDescription = existingAsset?.description || "";
  const suggestedBookable = existingAsset?.is_bookable ? "yes" : "no";

  const assetCode = prompt("Asset code", suggestedCode);
  if (assetCode === null) return null;

  const name = prompt("Asset name", suggestedName);
  if (!name) return null;

  const category = prompt("Category", suggestedCategory);
  if (!category) return null;

  const department = prompt(
    `Department (${departments.map((item) => item.department_name).join(", ")})`,
    suggestedDepartment
  );
  if (!department) return null;

  const assignedTo = prompt("Assigned to", suggestedAssignedTo);
  if (assignedTo === null) return null;

  const status = prompt("Status (Available, Allocated, Maintenance, Retired, Booked)", suggestedStatus);
  if (!status) return null;

  const isBookable = prompt("Is this resource bookable? (yes/no)", suggestedBookable);
  if (!isBookable) return null;

  const description = prompt("Description", suggestedDescription);
  if (description === null) return null;

  return {
    assetCode: assetCode.trim(),
    name: name.trim(),
    category: category.trim(),
    department: department.trim(),
    assignedTo: assignedTo.trim() || "Available",
    status: status.trim(),
    isBookable: isBookable.trim().toLowerCase() === "yes",
    description: description.trim()
  };
}

async function initializeAllocationPage() {
  const form = getPageForm();
  const tbody = getTableBody();
  const headerButton = topPrimaryButton();
  const selects = form.querySelectorAll("select");
  const dateInputs = form.querySelectorAll('input[type="date"]');
  const remarksField = form.querySelector("textarea");
  const [assetSelect, employeeSelect, departmentSelect, statusSelect] = selects;
  const [allocationDateInput, expectedReturnInput] = dateInputs;

  headerButton?.addEventListener("click", () => {
    resetFormState(form, "Save Allocation");
    scrollToForm(form);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      assetId: Number(assetSelect.value),
      employeeName: employeeSelect.options[employeeSelect.selectedIndex]?.text || employeeSelect.value,
      departmentName: departmentSelect.value,
      allocationDate: allocationDateInput.value,
      expectedReturnDate: expectedReturnInput.value || null,
      status: statusSelect.value,
      remarks: remarksField.value.trim()
    };

    if (form.dataset.recordId) {
      await apiFetch(`/allocations/${form.dataset.recordId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await apiFetch("/allocations", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    resetFormState(form, "Save Allocation");
    await populateAllocationInputs();
    await loadAllocationData();
  });

  tbody.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const action = button.dataset.action;
    const allocationId = button.dataset.id;
    const allocations = await apiFetch("/allocations");
    const allocation = allocations.find((item) => String(item.id) === allocationId);

    if (!allocation) return;

    if (action === "edit") {
      assetSelect.value = allocation.asset_id;
      employeeSelect.value = allocation.employee_name;
      departmentSelect.value = allocation.department_name;
      allocationDateInput.value = normalizeDateInput(allocation.allocation_date);
      expectedReturnInput.value = normalizeDateInput(allocation.expected_return_date);
      statusSelect.value = allocation.status;
      remarksField.value = allocation.remarks || "";
      form.dataset.recordId = allocation.id;
      setSubmitButtonText(form, "Update Allocation");
      scrollToForm(form);
    }

    if (action === "return") {
      await apiFetch(`/allocations/${allocation.id}/return`, { method: "PATCH", body: JSON.stringify({}) });
      await loadAllocationData();
    }

    if (action === "transfer") {
      await apiFetch(`/allocations/${allocation.id}/transfer`, { method: "PATCH", body: JSON.stringify({}) });
      await loadAllocationData();
    }

    if (action === "view") {
      showRecordAlert("Allocation Details", [
        `Code: ${allocation.allocation_code}`,
        `Asset: ${allocation.asset_code} - ${allocation.asset_name}`,
        `Employee: ${allocation.employee_name}`,
        `Department: ${allocation.department_name}`,
        `Allocated On: ${formatDate(allocation.allocation_date)}`,
        `Expected Return: ${formatDate(allocation.expected_return_date)}`,
        `Status: ${allocation.status}`,
        `Remarks: ${allocation.remarks || "-"}`
      ]);
    }
  });

  await populateAllocationInputs();
  await loadAllocationData();

  async function populateAllocationInputs() {
    const [assets, employees, departments] = await Promise.all([
      apiFetch("/assets"),
      apiFetch("/employees"),
      apiFetch("/departments")
    ]);

    populateSelect(
      assetSelect,
      assets.map((asset) => ({ id: asset.id, label: `${asset.asset_code} - ${asset.name}` })),
      { placeholder: "Select Asset", valueKey: "id", labelKey: "label" }
    );

    populateSelect(
      employeeSelect,
      employees.map((employee) => ({
        value: employee.full_name,
        label: `${employee.full_name} (${employee.department_name})`
      })),
      { placeholder: "Select Employee" }
    );

    populateSelect(
      departmentSelect,
      departments.map((department) => ({
        value: department.department_name,
        label: department.department_name
      })),
      { placeholder: "Select Department" }
    );
  }

  async function loadAllocationData() {
    const [summary, allocations] = await Promise.all([
      apiFetch("/allocations/summary"),
      apiFetch("/allocations")
    ]);

    setCardValues([
      summary.totalAllocations,
      summary.active,
      summary.transfers,
      summary.pendingReturns
    ]);

    tbody.innerHTML = allocations.map((allocation) => `
      <tr>
        <td>${escapeHtml(allocation.asset_code)}</td>
        <td>${escapeHtml(allocation.asset_name)}</td>
        <td>${escapeHtml(allocation.employee_name)}</td>
        <td>${escapeHtml(allocation.department_name)}</td>
        <td>${formatDate(allocation.allocation_date)}</td>
        <td>${formatDate(allocation.expected_return_date)}</td>
        <td>${renderStatus(allocation.status)}</td>
        <td>${renderAllocationActions(allocation)}</td>
      </tr>
    `).join("");
  }
}

function renderAllocationActions(allocation) {
  if (allocation.status === "Allocated") {
    return `
      <button data-action="edit" data-id="${allocation.id}">Edit</button>
      <button data-action="return" data-id="${allocation.id}">Return</button>
    `;
  }

  if (allocation.status === "Temporary") {
    return `
      <button data-action="edit" data-id="${allocation.id}">Edit</button>
      <button data-action="transfer" data-id="${allocation.id}">Transfer</button>
    `;
  }

  return `<button data-action="view" data-id="${allocation.id}">View</button>`;
}

async function initializeBookingPage() {
  const form = getPageForm();
  const tbody = getTableBody();
  const headerButton = topPrimaryButton();
  const resourceSelect = form.querySelector("select");
  const textInputs = form.querySelectorAll('input[type="text"]');
  const [employeeInput, purposeInput] = textInputs;
  const dateInput = form.querySelector('input[type="date"]');
  const timeInputs = form.querySelectorAll('input[type="time"]');
  const [startTimeInput, endTimeInput] = timeInputs;
  const remarksField = form.querySelector("textarea");

  headerButton?.addEventListener("click", () => {
    resetFormState(form, "Book Resource");
    scrollToForm(form);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      assetId: Number(resourceSelect.value),
      employeeName: employeeInput.value.trim(),
      bookingDate: dateInput.value,
      purpose: purposeInput.value.trim(),
      startTime: startTimeInput.value,
      endTime: endTimeInput.value,
      remarks: remarksField.value.trim()
    };

    if (form.dataset.recordId) {
      await apiFetch(`/bookings/${form.dataset.recordId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    resetFormState(form, "Book Resource");
    await populateBookingResources();
    await loadBookingData();
  });

  tbody.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const booking = await getRecordById("/bookings", button.dataset.id);
    if (!booking) return;

    if (button.dataset.action === "edit") {
      resourceSelect.value = booking.asset_id;
      employeeInput.value = booking.employee_name;
      dateInput.value = normalizeDateInput(booking.booking_date);
      purposeInput.value = booking.purpose;
      startTimeInput.value = formatTime(booking.start_time);
      endTimeInput.value = formatTime(booking.end_time);
      remarksField.value = booking.remarks || "";
      form.dataset.recordId = booking.id;
      setSubmitButtonText(form, "Update Booking");
      scrollToForm(form);
    }

    if (button.dataset.action === "status") {
      await apiFetch(`/bookings/${booking.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: button.dataset.status })
      });
      await loadBookingData();
    }

    if (button.dataset.action === "view") {
      showRecordAlert("Booking Details", [
        `Code: ${booking.booking_code}`,
        `Resource: ${booking.resource_name}`,
        `Employee: ${booking.employee_name}`,
        `Date: ${formatDate(booking.booking_date)}`,
        `Time: ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`,
        `Purpose: ${booking.purpose}`,
        `Status: ${booking.status}`,
        `Remarks: ${booking.remarks || "-"}`
      ]);
    }
  });

  await populateBookingResources();
  await loadBookingData();

  async function populateBookingResources() {
    const assets = await apiFetch("/assets?bookable=true");
    populateSelect(
      resourceSelect,
      assets.map((asset) => ({ id: asset.id, label: asset.name })),
      { placeholder: "Select Resource", valueKey: "id", labelKey: "label" }
    );
  }

  async function loadBookingData() {
    const [summary, bookings] = await Promise.all([
      apiFetch("/bookings/summary"),
      apiFetch("/bookings")
    ]);

    setCardValues([
      summary.totalResources,
      summary.available,
      summary.bookedToday,
      summary.pendingRequests
    ]);

    tbody.innerHTML = bookings.map((booking) => `
      <tr>
        <td>${escapeHtml(booking.booking_code)}</td>
        <td>${escapeHtml(booking.resource_name)}</td>
        <td>${escapeHtml(booking.employee_name)}</td>
        <td>${formatDate(booking.booking_date)}</td>
        <td>${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}</td>
        <td>${escapeHtml(booking.purpose)}</td>
        <td>${renderStatus(booking.status)}</td>
        <td>${renderBookingActions(booking)}</td>
      </tr>
    `).join("");
  }
}

function renderBookingActions(booking) {
  if (booking.status === "Pending") {
    return `
      <button data-action="status" data-status="Confirmed" data-id="${booking.id}">Approve</button>
      <button data-action="status" data-status="Rejected" data-id="${booking.id}">Reject</button>
    `;
  }

  if (booking.status === "Booked") {
    return `
      <button data-action="edit" data-id="${booking.id}">Edit</button>
      <button data-action="status" data-status="Returned" data-id="${booking.id}">Return</button>
    `;
  }

  if (booking.status === "Confirmed") {
    return `
      <button data-action="edit" data-id="${booking.id}">Edit</button>
      <button data-action="status" data-status="Cancelled" data-id="${booking.id}">Cancel</button>
    `;
  }

  return `<button data-action="view" data-id="${booking.id}">View</button>`;
}

async function initializeMaintenancePage() {
  const form = getPageForm();
  const tbody = getTableBody();
  const headerButton = topPrimaryButton();
  const selects = form.querySelectorAll("select");
  const [assetSelect, typeSelect] = selects;
  const requesterInput = form.querySelector('input[type="text"]');
  const dateInput = form.querySelector('input[type="date"]');
  const issueField = form.querySelector("textarea");

  headerButton?.addEventListener("click", () => {
    resetFormState(form, "Submit Request");
    scrollToForm(form);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      assetId: Number(assetSelect.value),
      maintenanceType: typeSelect.value,
      requestedBy: requesterInput.value.trim(),
      maintenanceDate: dateInput.value,
      issueDescription: issueField.value.trim()
    };

    if (form.dataset.recordId) {
      await apiFetch(`/maintenance/${form.dataset.recordId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await apiFetch("/maintenance", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    resetFormState(form, "Submit Request");
    await populateMaintenanceAssets();
    await loadMaintenanceData();
  });

  tbody.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const request = await getRecordById("/maintenance", button.dataset.id);
    if (!request) return;

    if (button.dataset.action === "edit") {
      assetSelect.value = request.asset_id;
      typeSelect.value = request.maintenance_type;
      requesterInput.value = request.requested_by;
      dateInput.value = normalizeDateInput(request.maintenance_date);
      issueField.value = request.issue_description;
      form.dataset.recordId = request.id;
      setSubmitButtonText(form, "Update Request");
      scrollToForm(form);
    }

    if (button.dataset.action === "assign") {
      const technicianName = prompt("Assign technician", request.technician_name || "");
      if (!technicianName) return;
      await apiFetch(`/maintenance/${request.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "In Progress", technicianName })
      });
      await loadMaintenanceData();
    }

    if (button.dataset.action === "complete") {
      await apiFetch(`/maintenance/${request.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Completed" })
      });
      await loadMaintenanceData();
    }

    if (button.dataset.action === "view") {
      showRecordAlert("Maintenance Details", [
        `Code: ${request.request_code}`,
        `Asset: ${request.asset_name}`,
        `Type: ${request.maintenance_type}`,
        `Requested By: ${request.requested_by}`,
        `Date: ${formatDate(request.maintenance_date)}`,
        `Status: ${request.status}`,
        `Technician: ${request.technician_name || "-"}`,
        `Issue: ${request.issue_description}`
      ]);
    }
  });

  await populateMaintenanceAssets();
  await loadMaintenanceData();

  async function populateMaintenanceAssets() {
    const assets = await apiFetch("/assets");
    populateSelect(
      assetSelect,
      assets.map((asset) => ({ id: asset.id, label: `${asset.asset_code} - ${asset.name}` })),
      { placeholder: "Select Asset", valueKey: "id", labelKey: "label" }
    );
  }

  async function loadMaintenanceData() {
    const [summary, requests] = await Promise.all([
      apiFetch("/maintenance/summary"),
      apiFetch("/maintenance")
    ]);

    setCardValues([
      summary.totalRequests,
      summary.scheduled,
      summary.inProgress,
      summary.completed
    ]);

    tbody.innerHTML = requests.map((request) => `
      <tr>
        <td>${escapeHtml(request.request_code)}</td>
        <td>${escapeHtml(request.asset_name)}</td>
        <td>${escapeHtml(request.maintenance_type)}</td>
        <td>${escapeHtml(request.requested_by)}</td>
        <td>${formatDate(request.maintenance_date)}</td>
        <td>${renderStatus(request.status)}</td>
        <td>${escapeHtml(request.technician_name || "-")}</td>
        <td>${renderMaintenanceActions(request)}</td>
      </tr>
    `).join("");
  }
}

function renderMaintenanceActions(request) {
  if (request.status === "Scheduled") {
    return `
      <button data-action="edit" data-id="${request.id}">Edit</button>
      <button data-action="assign" data-id="${request.id}">Assign</button>
    `;
  }

  if (request.status === "In Progress") {
    return `
      <button data-action="view" data-id="${request.id}">View</button>
      <button data-action="complete" data-id="${request.id}">Complete</button>
    `;
  }

  return `<button data-action="view" data-id="${request.id}">View</button>`;
}

async function initializeAuditPage() {
  const form = getPageForm();
  const tbody = getTableBody();
  const headerButton = topPrimaryButton();
  const selects = form.querySelectorAll("select");
  const [departmentSelect, typeSelect] = selects;
  const dateInput = form.querySelector('input[type="date"]');
  const auditorInput = form.querySelector('input[type="text"]');
  const remarksField = form.querySelector("textarea");

  headerButton?.addEventListener("click", () => {
    resetFormState(form, "Schedule Audit");
    scrollToForm(form);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      departmentName: departmentSelect.value,
      auditorName: auditorInput.value.trim(),
      auditDate: dateInput.value,
      auditType: typeSelect.value,
      remarks: remarksField.value.trim()
    };

    if (form.dataset.recordId) {
      await apiFetch(`/audits/${form.dataset.recordId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await apiFetch("/audits", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    resetFormState(form, "Schedule Audit");
    await populateAuditDepartments();
    await loadAuditData();
  });

  tbody.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const audit = await getRecordById("/audits", button.dataset.id);
    if (!audit) return;

    if (button.dataset.action === "edit") {
      departmentSelect.value = audit.department_name;
      dateInput.value = normalizeDateInput(audit.audit_date);
      auditorInput.value = audit.auditor_name;
      typeSelect.value = audit.audit_type;
      remarksField.value = audit.remarks || "";
      form.dataset.recordId = audit.id;
      setSubmitButtonText(form, "Update Audit");
      scrollToForm(form);
    }

    if (button.dataset.action === "status") {
      await apiFetch(`/audits/${audit.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: button.dataset.status })
      });
      await loadAuditData();
    }

    if (button.dataset.action === "view") {
      showRecordAlert("Audit Details", [
        `Code: ${audit.audit_code}`,
        `Department: ${audit.department_name}`,
        `Auditor: ${audit.auditor_name}`,
        `Date: ${formatDate(audit.audit_date)}`,
        `Type: ${audit.audit_type}`,
        `Assets Checked: ${audit.assets_checked}`,
        `Issues Found: ${audit.issues_found}`,
        `Status: ${audit.status}`,
        `Remarks: ${audit.remarks || "-"}`
      ]);
    }
  });

  await populateAuditDepartments();
  await loadAuditData();

  async function populateAuditDepartments() {
    const departments = await apiFetch("/departments");
    populateSelect(
      departmentSelect,
      departments.map((department) => ({
        value: department.department_name,
        label: department.department_name
      })),
      { placeholder: "Select Department" }
    );
  }

  async function loadAuditData() {
    const [summary, audits] = await Promise.all([
      apiFetch("/audits/summary"),
      apiFetch("/audits")
    ]);

    setCardValues([
      summary.totalAudits,
      summary.completed,
      summary.pending,
      summary.issuesFound
    ]);

    tbody.innerHTML = audits.map((audit) => `
      <tr>
        <td>${escapeHtml(audit.audit_code)}</td>
        <td>${escapeHtml(audit.department_name)}</td>
        <td>${escapeHtml(audit.auditor_name)}</td>
        <td>${formatDate(audit.audit_date)}</td>
        <td>${escapeHtml(audit.assets_checked)}</td>
        <td>${escapeHtml(audit.issues_found)}</td>
        <td>${renderStatus(audit.status)}</td>
        <td>${renderAuditActions(audit)}</td>
      </tr>
    `).join("");
  }
}

function renderAuditActions(audit) {
  if (audit.status === "Pending") {
    return `
      <button data-action="edit" data-id="${audit.id}">Edit</button>
      <button data-action="status" data-status="In Progress" data-id="${audit.id}">Start</button>
    `;
  }

  if (audit.status === "Scheduled") {
    return `
      <button data-action="edit" data-id="${audit.id}">Edit</button>
      <button data-action="status" data-status="Cancelled" data-id="${audit.id}">Cancel</button>
    `;
  }

  if (audit.status === "In Progress") {
    return `<button data-action="view" data-id="${audit.id}">Continue</button>`;
  }

  return `<button data-action="view" data-id="${audit.id}">View</button>`;
}

async function initializeNotificationPage() {
  const tbody = getTableBody();
  const headerButton = topPrimaryButton();
  const filterForm = getPageForm();
  const [categorySelect, statusSelect] = filterForm.querySelectorAll("select");

  headerButton?.addEventListener("click", async () => {
    await apiFetch("/notifications/read-all", {
      method: "PATCH",
      body: JSON.stringify({})
    });
    await loadNotificationData();
  });

  categorySelect.addEventListener("change", loadNotificationData);
  statusSelect.addEventListener("change", loadNotificationData);

  tbody.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const id = button.dataset.id;

    if (button.dataset.action === "read") {
      await apiFetch(`/notifications/${id}/read`, {
        method: "PATCH",
        body: JSON.stringify({})
      });
      await loadNotificationData();
    }

    if (button.dataset.action === "delete") {
      await apiFetch(`/notifications/${id}`, { method: "DELETE" });
      await loadNotificationData();
    }

    if (button.dataset.action === "view") {
      const notifications = await apiFetch(`/notifications?category=${encodeURIComponent(categorySelect.value)}&status=${encodeURIComponent(statusSelect.value)}`);
      const notification = notifications.find((item) => String(item.id) === id);
      if (!notification) return;
      showRecordAlert("Notification", [
        `Date: ${formatDate(notification.created_at)}`,
        `Category: ${notification.category}`,
        `Priority: ${notification.priority}`,
        `Status: ${notification.status}`,
        `Message: ${notification.message}`
      ]);
    }
  });

  await loadNotificationData();

  async function loadNotificationData() {
    const [summary, notifications] = await Promise.all([
      apiFetch("/notifications/summary"),
      apiFetch(`/notifications?category=${encodeURIComponent(categorySelect.value)}&status=${encodeURIComponent(statusSelect.value)}`)
    ]);

    setCardValues([
      summary.totalNotifications,
      summary.unread,
      summary.today,
      summary.highPriority
    ]);

    tbody.innerHTML = notifications.map((notification) => `
      <tr>
        <td>${formatDate(notification.created_at)}</td>
        <td>${escapeHtml(notification.category)}</td>
        <td>${escapeHtml(notification.message)}</td>
        <td>${escapeHtml(notification.priority)}</td>
        <td>${renderStatus(notification.status)}</td>
        <td>${renderNotificationActions(notification)}</td>
      </tr>
    `).join("");
  }
}

function renderNotificationActions(notification) {
  if (notification.status === "Unread") {
    return `
      <button data-action="read" data-id="${notification.id}">Read</button>
      <button data-action="delete" data-id="${notification.id}">Delete</button>
    `;
  }

  return `<button data-action="view" data-id="${notification.id}">View</button>`;
}

async function initializeReportPage() {
  const form = getPageForm();
  const tbody = document.querySelectorAll(".table-section tbody")[0];
  const headerButton = topPrimaryButton();
  const selects = form.querySelectorAll("select");
  const [reportTypeSelect, departmentSelect] = selects;
  const dateInputs = form.querySelectorAll('input[type="date"]');
  const [fromDateInput, toDateInput] = dateInputs;

  headerButton?.addEventListener("click", async () => {
    await downloadAuthenticatedFile("/reports/export/summary", "asset-summary.csv");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const report = await apiFetch("/reports/generate", {
      method: "POST",
      body: JSON.stringify({
        reportType: reportTypeSelect.value,
        department: departmentSelect.value,
        fromDate: fromDateInput.value || null,
        toDate: toDateInput.value || null
      })
    });

    await Promise.all([
      loadReportData(),
      loadReportChart()
    ]);

    await downloadAuthenticatedFile(`/reports/${report.id}/download`, report.file_name || "report.csv");
  });

  tbody.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const reportId = button.dataset.id;

    if (button.dataset.action === "view") {
      const report = await apiFetch(`/reports/${reportId}`);
      showRecordAlert("Report Details", [
        `Code: ${report.report_code}`,
        `Name: ${report.report_name}`,
        `Type: ${report.report_type}`,
        `Department: ${report.department_filter || "All Departments"}`,
        `Date: ${formatDate(report.created_at)}`,
        `Generated By: ${report.generated_by}`,
        `Format: ${report.format}`
      ]);
    }

    if (button.dataset.action === "download") {
      const report = await apiFetch(`/reports/${reportId}`);
      await downloadAuthenticatedFile(`/reports/${reportId}/download`, report.file_name || "report.csv");
    }
  });

  await populateReportDepartments();
  await Promise.all([
    loadReportCards(),
    loadReportChart(),
    loadReportData()
  ]);

  async function populateReportDepartments() {
    const departments = await apiFetch("/departments");
    populateSelect(
      departmentSelect,
      [{ value: "All Departments", label: "All Departments" }].concat(
        departments.map((department) => ({
          value: department.department_name,
          label: department.department_name
        }))
      ),
      { placeholder: "All Departments" }
    );
    departmentSelect.value = "All Departments";
  }

  async function loadReportCards() {
    const summary = await apiFetch("/reports/summary");
    setCardValues([
      summary.totalAssets,
      summary.allocated,
      summary.available,
      summary.maintenance
    ]);
  }

  async function loadReportChart() {
    const distribution = await apiFetch("/reports/distribution");
    const chartNode = document.getElementById("assetChart");
    const existingChart = window.Chart?.getChart(chartNode);

    const labels = ["Allocated", "Available", "Maintenance"];
    const totals = labels.map((label) => {
      const row = distribution.find((item) => item.status === label);
      return row ? row.total : 0;
    });

    if (existingChart) {
      existingChart.data.labels = labels;
      existingChart.data.datasets[0].data = totals;
      existingChart.update();
    }
  }

  async function loadReportData() {
    const reports = await apiFetch("/reports");
    tbody.innerHTML = reports.map((report) => `
      <tr>
        <td>${escapeHtml(report.report_code)}</td>
        <td>${escapeHtml(report.report_name)}</td>
        <td>${formatDate(report.created_at)}</td>
        <td>${escapeHtml(report.generated_by)}</td>
        <td>${escapeHtml(report.format)}</td>
        <td>
          <button data-action="view" data-id="${report.id}">View</button>
          <button data-action="download" data-id="${report.id}">Download</button>
        </td>
      </tr>
    `).join("");
  }
}

async function getRecordById(endpoint, id) {
  const records = await apiFetch(endpoint);
  return records.find((record) => String(record.id) === String(id));
}

function normalizeDateInput(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}
