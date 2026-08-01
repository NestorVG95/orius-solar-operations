import {
  DEMO_CREDENTIALS,
  DEFAULT_PERMISSIONS,
  PERMISSION_DEFINITIONS,
  ROLE_DEFINITIONS,
  escapeHtml as esc,
  formatDate,
  isValidDemoCredentials,
  roleLabel,
  statusClass,
  validateTransferInput,
  validatePasswordResetInput,
  validateUserInput,
  validateWarrantyInput,
} from "./core.js";

const runtime = window.ORIUS_CONFIG || { demoMode: true, apiBase: "/api/index.php" };
const STORAGE_KEY = "orius-solar-portfolio-demo-v1";
const SESSION_KEY = "orius-solar-session-v1";

const seed = {
  warranties: [
    { id: "WAR-2024-018", project: "OR-018", customer: "Maya Thompson", site: "28 Juniper Ridge, Austin TX", type: "10-Year Workmanship", issued: "2024-06-18", status: "Issued" },
    { id: "WAR-2024-017", project: "OR-017", customer: "Evan Brooks", site: "91 Cedar Loop, Mesa AZ", type: "5-Year Roof Penetration", issued: "2024-06-12", status: "Issued" },
    { id: "WAR-2024-016", project: "OR-016", customer: "Nora Patel", site: "604 Suncrest Ave, Reno NV", type: "1-Year Energy Production", issued: "2024-06-04", status: "Review" },
  ],
  assets: [
    { id: "TL-042", name: "Torque wrench / 1⁄2 in", location: "Van OR-04", owner: "Crew Delta", status: "Checked out" },
    { id: "TL-019", name: "Fall-arrest harness / M", location: "Warehouse A", owner: "Available", status: "Ready" },
    { id: "EQ-112", name: "Microinverter tester", location: "Van OR-02", owner: "Crew Sierra", status: "Checked out" },
    { id: "TL-008", name: "Panel cleaning kit", location: "Warehouse A", owner: "Available", status: "Ready" },
  ],
  activity: [
    { title: "Warranty certificate issued", detail: "WAR-2024-018 · Maya Thompson", time: "18 Jun · 14:32" },
    { title: "Tool checked out", detail: "TL-042 · Van OR-04", time: "18 Jun · 08:11" },
    { title: "Project trail updated", detail: "OR-018 · Crew Delta assigned", time: "17 Jun · 16:48" },
  ],
  users: [
    { id: "demo-user", name: "Alex Rivera", email: "demo@orius.local", role: "admin", status: "Active", lastAccess: "Just now" },
    { id: "usr-102", name: "Morgan Chen", email: "morgan.chen@example.test", role: "manager", status: "Active", lastAccess: "Today · 08:42" },
    { id: "usr-103", name: "Taylor Brooks", email: "taylor.brooks@example.test", role: "warehouse", status: "Active", lastAccess: "Yesterday · 16:10" },
  ],
  permissions: DEFAULT_PERMISSIONS,
};

const cloneSeed = () => JSON.parse(JSON.stringify(seed));
const loadState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return cloneSeed();
    const defaults = cloneSeed();
    return { ...defaults, ...saved, users: saved.users || defaults.users, permissions: saved.permissions || defaults.permissions };
  } catch { return cloneSeed(); }
};
const saveState = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* private browsing: keep the current session in memory */ } };
const icon = (id) => `<svg aria-hidden="true"><use href="#icon-${id}"></use></svg>`;
const authView = document.querySelector("#auth-view");
const appShell = document.querySelector("#app-shell");
const view = document.querySelector("#app-view");
let state = cloneSeed();
let currentUser = null;
let csrfToken = "";
let activeRoute = "";

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

const apiRequest = async (action, options = {}) => {
  const headers = { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}), ...(options.headers || {}) };
  const response = await fetch(`${runtime.apiBase}?action=${encodeURIComponent(action)}`, { credentials: "include", ...options, headers });
  let payload = null;
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok) throw new ApiError(payload.message || "The secure service did not respond.", response.status);
  if (payload.csrfToken) csrfToken = payload.csrfToken;
  return payload;
};

function toast(message, error = false) {
  const node = document.createElement("div");
  node.className = `toast${error ? " is-error" : ""}`;
  node.textContent = message;
  document.querySelector("#toast-region").append(node);
  window.setTimeout(() => node.remove(), 3600);
}

function authBrand() {
  return `<div class="auth-brand"><img src="./assets/orius-mark.png" alt="" /><div><strong>orius solar</strong><span class="role-chip">operations crm</span></div></div>`;
}

function renderLogin(message = "") {
  currentUser = null; appShell.hidden = true; authView.hidden = false;
  authView.innerHTML = `<div class="auth-visual"><div class="auth-visual-copy"><p class="kicker">Orius Solar / secure workspace</p><h1>Keep the workday moving. Keep the <em>trail</em> intact.</h1><p>One calm workspace for warranty documents, tools, crews, and the operational record that connects them.</p><div class="auth-proof"><span>01</span><p>One source of truth for every field handoff.</p></div></div></div><div class="auth-panel"><div class="auth-panel-inner">${authBrand()}<div class="auth-header"><p class="kicker">Workspace access</p><h2>Sign in to operations</h2><p>Use your organization account to continue.</p></div><form class="auth-form" id="login-form"><div class="field"><label for="login-email">Work email</label><input id="login-email" name="email" type="email" autocomplete="username" placeholder="you@company.com" required /></div><div class="field"><div class="field-heading"><label for="login-password">Password</label><button class="inline-link" type="button" id="forgot-password-link">Forgot password?</button></div><div class="password-field"><input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" minlength="8" required /><button class="password-toggle" type="button" id="password-toggle" aria-label="Show password">${icon("file")}</button></div></div><p class="auth-message" id="auth-message" role="alert">${esc(message)}</p><button class="button button-primary" type="submit" id="login-button">Sign in ${icon("arrow")}</button></form>${runtime.demoMode ? `<div class="demo-access"><span class="note-mark">i</span><div><strong>Demo access</strong><span>Email <code>${DEMO_CREDENTIALS.email}</code> · Password <code>${DEMO_CREDENTIALS.password}</code></span></div></div>` : ""}<p class="auth-legal">Your session is protected by a secure cookie and server-side authorization.</p></div></div>`;
  document.querySelector("#login-form").addEventListener("submit", handleLogin);
  document.querySelector("#forgot-password-link").addEventListener("click", () => renderPasswordRecovery());
  document.querySelector("#password-toggle").addEventListener("click", () => { const input = document.querySelector("#login-password"); const showing = input.type === "text"; input.type = showing ? "password" : "text"; document.querySelector("#password-toggle").setAttribute("aria-label", showing ? "Show password" : "Hide password"); });
}

function renderPasswordRecovery(message = "") {
  currentUser = null; appShell.hidden = true; authView.hidden = false;
  authView.innerHTML = `<div class="auth-visual"><div class="auth-visual-copy"><p class="kicker">Account recovery / protected flow</p><h1>Get back to the workday without exposing the <em>account.</em></h1><p>We will send recovery instructions only when the address belongs to the workspace. The response never reveals whether an account exists.</p><div class="auth-proof"><span>02</span><p>Generic responses protect account ownership.</p></div></div></div><div class="auth-panel"><div class="auth-panel-inner">${authBrand()}<div class="auth-header"><p class="kicker">Password recovery</p><h2>Reset your password</h2><p>Enter your work email and we will start the secure recovery flow.</p></div><form class="auth-form" id="recovery-form"><div class="field"><label for="recovery-email">Work email</label><input id="recovery-email" name="email" type="email" autocomplete="email" placeholder="you@company.com" required /></div><p class="auth-message" id="recovery-message" role="status">${esc(message)}</p><button class="button button-primary" type="submit" id="recovery-button">Send recovery link ${icon("arrow")}</button></form><button class="text-button auth-back-link" type="button" id="back-to-login">Back to sign in</button>${runtime.demoMode ? `<div class="demo-access recovery-note"><span class="note-mark">i</span><div><strong>Safe demo mode</strong><span>No email is sent. The flow is simulated locally.</span></div></div>` : ""}</div></div>`;
  document.querySelector("#recovery-form").addEventListener("submit", handlePasswordRecovery);
  document.querySelector("#back-to-login").addEventListener("click", () => renderLogin());
}

async function handlePasswordRecovery(event) {
  event.preventDefault(); const email = new FormData(event.currentTarget).get("email"); const validation = validatePasswordResetInput({ email }); const message = document.querySelector("#recovery-message"); const button = document.querySelector("#recovery-button");
  if (!validation.valid) { message.textContent = validation.message; message.className = "auth-message is-error"; return; }
  button.disabled = true; button.textContent = "Preparing recovery…";
  try { if (!runtime.demoMode) await apiRequest("request-password-reset", { method: "POST", body: JSON.stringify(validation.value) }); message.className = "auth-message is-success"; message.textContent = "If the account exists, recovery instructions will be sent shortly."; button.textContent = "Recovery requested"; } catch (error) { message.className = "auth-message is-error"; message.textContent = error.message || "Unable to start recovery. Try again."; button.disabled = false; button.innerHTML = `Send recovery link ${icon("arrow")}`; }
}
async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget); const email = String(form.get("email")).trim().toLowerCase(); const password = String(form.get("password"));
  const button = document.querySelector("#login-button"); const message = document.querySelector("#auth-message");
  button.disabled = true; button.textContent = "Checking access…"; message.textContent = "";
  try {
    if (runtime.demoMode) {
      if (!isValidDemoCredentials(email, password)) throw new ApiError("Demo credentials do not match. Use the access shown below.", 401);
      currentUser = { id: "demo-user", name: "Alex Rivera", email, role: "admin" };
    } else {
      const response = await apiRequest("login", { method: "POST", body: JSON.stringify({ email, password }) });
      currentUser = response.user;
    }
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); } catch { /* session storage can be unavailable */ }
    await enterWorkspace();
  } catch (error) {
    message.textContent = error.message || "Unable to sign in. Try again.";
    button.disabled = false; button.innerHTML = `Sign in ${icon("arrow")}`;
  }
}

async function enterWorkspace() {
  state = runtime.demoMode ? loadState() : await loadRemoteState();
  authView.hidden = true; appShell.hidden = false; updateUserChrome();
  navigate(window.location.hash.slice(1) || "overview");
}

async function loadRemoteState() {
  const [warranties, assets, activity] = await Promise.all([apiRequest("warranties"), apiRequest("assets"), apiRequest("timeline")]);
  const stateData = { warranties: warranties.records || [], assets: assets.records || [], activity: activity.records || [], users: [], permissions: DEFAULT_PERMISSIONS };
  if (["admin", "operations_admin"].includes(currentUser?.role)) {
    const [users, permissions] = await Promise.all([apiRequest("users"), apiRequest("permissions")]);
    stateData.users = users.records || [];
    stateData.permissions = permissions.records || DEFAULT_PERMISSIONS;
  }
  return stateData;
}

const canManageUsers = () => ["admin", "operations_admin"].includes(currentUser?.role);
const canManageRoles = () => currentUser?.role === "admin";

function updateUserChrome() {
  const name = currentUser?.name || "Operator"; const initials = name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  document.querySelector("#user-name").textContent = name; document.querySelector("#user-role").textContent = roleLabel(currentUser?.role || "viewer"); document.querySelector("#user-menu-button").textContent = initials;
  document.querySelector("#adapter-label").textContent = runtime.demoMode ? "Local demo adapter" : "Secure API session";
  document.querySelector(".nav-label-admin").hidden = !canManageUsers();
  document.querySelectorAll("[data-requires-users]").forEach((item) => { item.hidden = !canManageUsers(); });
  document.querySelectorAll("[data-requires-roles]").forEach((item) => { item.hidden = !canManageRoles(); });
}

function shellHeader(kicker, title, body, action = "") {
  return `<header class="${action ? "view-header" : "subpage-header"}"><div><p class="kicker">${kicker}</p><h1>${title}</h1>${body ? `<p>${body}</p>` : ""}</div>${action}</header>`;
}

function renderOverview() {
  const latest = state.warranties[0] || { id: "No record", project: "—", customer: "No customer yet", site: "Create a warranty to begin", type: "Pending", issued: new Date().toISOString().slice(0, 10), status: "Review" };
  return `${shellHeader("Field operations / " + (runtime.demoMode ? "portfolio demo" : "authenticated workspace"), "Solar operations, with a <em>paper trail</em> that keeps up.", "A calm workspace for warranty records, asset custody, and project history — connected without slowing down the field team.", `<button class="button button-primary" data-route="warranties">Create a warranty ${icon("arrow")}</button>`)}<section class="hero-workbench" aria-label="Warranty workbench preview"><div class="hero-copy"><p class="kicker">Current workbench</p><h2>One certificate. Every operational detail connected.</h2><p>See the document, the project, the crew, and the equipment trail in one place. No tab hopping. No mystery records.</p><button class="button button-secondary" data-route="traceability">Open traceability ${icon("arrow")}</button></div><div class="certificate-preview"><div class="preview-head"><div><p class="kicker">Latest record</p><h3>Warranty certificate</h3></div><span class="status ${statusClass(latest.status)}">${esc(latest.status)}</span></div><div class="cert-id">${esc(latest.id)} / ${esc(latest.type)}</div><div class="cert-party">${esc(latest.customer)}</div><div class="cert-address">${esc(latest.site)}</div><div class="cert-line"></div><div class="cert-details"><div class="cert-detail"><small>Project</small><span>${esc(latest.project)}</span></div><div class="cert-detail"><small>Issued</small><span>${formatDate(latest.issued)}</span></div><div class="cert-detail"><small>Source</small><span>${runtime.demoMode ? "Local adapter" : "Secure API"}</span></div></div><div class="signature-line">${icon("check")} Document integrity verified</div></div></section><div class="section-grid"><section class="section-block"><div class="block-head"><h3>Recent activity</h3><a href="#traceability" data-route="traceability">View full trail ${icon("arrow")}</a></div><div class="trail">${state.activity.slice(0, 4).map((item) => `<div class="trail-item"><div class="trail-marker"></div><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></div><time>${esc(item.time)}</time></div>`).join("") || `<div class="empty-state">No activity yet. Create a record to start the trail.</div>`}</div></section><section class="section-block"><div class="block-head"><h3>Asset custody</h3><a href="#inventory" data-route="inventory">Open inventory ${icon("arrow")}</a></div><div class="asset-list">${state.assets.slice(0, 4).map((asset) => `<div class="asset-row"><span class="asset-icon">${icon("box")}</span><div><strong>${esc(asset.name)}</strong><span>${esc(asset.location)} · ${esc(asset.owner)}</span></div><span class="status ${statusClass(asset.status)}">${esc(asset.status)}</span></div>`).join("") || `<div class="empty-state">No assets registered.</div>`}</div></section></div>`;
}

function renderWarranties() {
  return `${shellHeader("Document registry / ${state.warranties.length} records", "Warranties", "Generate a certificate and keep its project trail searchable. Production mode writes through the protected API.")}<div class="toolbar"><div class="search-field">${icon("search")}<input id="warranty-search" type="search" placeholder="Search customer, project, or ID" aria-label="Search warranties" /></div><button class="button button-primary" data-scroll="warranty-form">${icon("plus")} Create warranty</button></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Record</th><th>Customer / site</th><th>Type</th><th>Issued</th><th>Status</th><th></th></tr></thead><tbody id="warranty-rows">${warrantyRows(state.warranties)}</tbody></table></div><div class="form-layout" id="warranty-form"><form class="form-panel" id="new-warranty-form"><h2>Issue a new warranty record</h2><div class="form-grid"><div class="field"><label for="project">Project number</label><input id="project" name="project" placeholder="OR-019" maxlength="6" pattern="OR-[0-9]{3}" required /></div><div class="field"><label for="customer">Customer name</label><input id="customer" name="customer" placeholder="Jordan Lee" minlength="2" maxlength="100" required /></div><div class="field field-full"><label for="site">Building address</label><input id="site" name="site" placeholder="123 Solar Way, Phoenix AZ" minlength="8" maxlength="180" required /></div><div class="field"><label for="type">Warranty type</label><select id="type" name="type"><option>10-Year Workmanship</option><option>5-Year Roof Penetration</option><option>1-Year Energy Production</option></select></div><div class="field"><label for="issued">Issued date</label><input id="issued" name="issued" type="date" required /></div></div><div class="form-actions"><button class="button button-primary" type="submit">Issue certificate ${icon("arrow")}</button><span class="form-message">${runtime.demoMode ? "Demo only · saved in this browser" : "Protected by server authorization"}</span></div></form><aside class="info-rail"><h3>Production boundary</h3><p>The browser never receives Drive credentials. The API validates the record, checks the operator role, and generates documents server-side.</p><ul><li>Validate and authorize on the server.</li><li>Generate PDFs outside the browser.</li><li>Write to a private Drive folder.</li></ul></aside></div>`;
}

function warrantyRows(records) {
  if (!records.length) return `<tr><td colspan="6"><div class="empty-state">No warranty records yet. Use the form below to create one.</div></td></tr>`;
  return records.map((record) => `<tr><td><span class="record-title">${esc(record.id)}</span><span class="record-subtitle">${esc(record.project)}</span></td><td><span class="record-title">${esc(record.customer)}</span><span class="record-subtitle">${esc(record.site)}</span></td><td>${esc(record.type)}</td><td class="mono">${formatDate(record.issued)}</td><td><span class="status ${statusClass(record.status)}">${esc(record.status)}</span></td><td><button class="icon-button" data-copy="${esc(record.id)}" aria-label="Copy warranty ID">${icon("file")}</button></td></tr>`).join("");
}

function renderInventory() {
  return `${shellHeader("Asset register / ${state.assets.length} assets", "Inventory & custody", "Know what is ready, what is moving, and what needs a handoff before the crew leaves the warehouse.")}<div class="toolbar"><div class="search-field">${icon("search")}<input id="asset-search" type="search" placeholder="Search asset, vehicle, or owner" aria-label="Search assets" /></div><button class="button button-primary" data-scroll="transfer-form">${icon("route")} Record transfer</button></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Asset</th><th>Location</th><th>Custodian</th><th>State</th><th>Asset ID</th><th></th></tr></thead><tbody id="asset-rows">${assetRows(state.assets)}</tbody></table></div><div class="form-layout" id="transfer-form"><form class="form-panel" id="new-transfer-form"><h2>Record an asset transfer</h2><div class="form-grid"><div class="field"><label for="asset">Asset</label><select id="asset" name="asset">${state.assets.map((asset) => `<option value="${esc(asset.id)}">${esc(asset.id)} · ${esc(asset.name)}</option>`).join("")}</select></div><div class="field"><label for="destination">New location</label><input id="destination" name="destination" maxlength="100" placeholder="Van OR-05" required /></div><div class="field field-full"><label for="custodian">Custodian or crew</label><input id="custodian" name="custodian" maxlength="100" placeholder="Crew Horizon" required /></div></div><div class="form-actions"><button class="button button-primary" type="submit">Save handoff ${icon("arrow")}</button><span class="form-message">${runtime.demoMode ? "Creates an audit event locally" : "Creates an immutable server audit event"}</span></div></form><aside class="info-rail"><h3>Traceability rule</h3><p>A handoff records the asset, destination, person or crew, and timestamp together so the history remains useful.</p><div class="key-row"><span class="status status-cyan">Ready</span><span>In a controlled location</span></div><div class="key-row"><span class="status status-amber">Checked out</span><span>Assigned to a field crew</span></div></aside></div>`;
}

function assetRows(records) {
  if (!records.length) return `<tr><td colspan="6"><div class="empty-state">No assets have been registered.</div></td></tr>`;
  return records.map((asset) => `<tr><td><span class="record-title">${esc(asset.name)}</span><span class="record-subtitle">${esc(asset.id)}</span></td><td>${esc(asset.location)}</td><td>${esc(asset.owner)}</td><td><span class="status ${statusClass(asset.status)}">${esc(asset.status)}</span></td><td class="mono">${esc(asset.id)}</td><td><button class="icon-button" data-copy="${esc(asset.id)}" aria-label="Copy asset ID">${icon("box")}</button></td></tr>`).join("");
}

function renderTraceability() {
  return `${shellHeader("Audit trail / connected records", "Traceability", "A readable history makes operational accountability visible without turning the workday into paperwork.")}<div class="trace-layout"><section class="trace-detail"><div class="block-head"><h3>OR-018 · Maya Thompson</h3><span class="status status-green">Complete trail</span></div>${state.activity.concat([{ title: "Warranty template selected", detail: "10-Year Workmanship · synthetic template", time: "17 Jun · 16:31" }]).slice(0, 8).map((item) => `<div class="trace-record"><time>${esc(item.time)}</time><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></div></div>`).join("")}</section><aside class="trace-key"><h3>What is connected</h3><div class="key-row">${icon("file")} Warranty document</div><div class="key-row">${icon("grid")} Project OR-018</div><div class="key-row">${icon("route")} Crew Delta</div><div class="key-row">${icon("box")} 2 assigned assets</div><div class="key-row">${icon("check")} ${runtime.demoMode ? "Synthetic / safe to explore" : "Server verified record"}</div></aside></div>`;
}

function userRows(records) {
  if (!records.length) return `<tr><td colspan="5"><div class="empty-state">No users have been created yet.</div></td></tr>`;
  return records.map((user) => `<tr><td><span class="record-title">${esc(user.name)}</span><span class="record-subtitle">${esc(user.email)}</span></td><td><span class="role-badge">${esc(roleLabel(user.role))}</span></td><td><span class="status status-green">${esc(user.status || "Active")}</span></td><td class="mono">${esc(user.lastAccess || "Never")}</td><td><button class="icon-button" data-user-info="${esc(user.email)}" aria-label="View user details">${icon("users")}</button></td></tr>`).join("");
}

function renderUsers() {
  if (!canManageUsers()) return `${shellHeader("Administration / restricted", "Users", "Your profile does not have permission to manage users.")}<div class="empty-state access-denied">${icon("lock")}<strong>Access restricted</strong><p>Ask an administrator for the users.manage permission.</p></div>`;
  return `${shellHeader("Administration / ${state.users.length} members", "Users", "Create operators, assign a profile, and keep access accountable.", `<button class="button button-primary" data-scroll="user-form">${icon("plus")} Create user</button>`)}<div class="toolbar"><div class="search-field">${icon("search")}<input id="user-search" type="search" placeholder="Search name or email" aria-label="Search users" /></div><span class="toolbar-note"><span class="status-dot"></span>Every user needs a named profile</span></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>User</th><th>Profile</th><th>Status</th><th>Last access</th><th></th></tr></thead><tbody id="user-rows">${userRows(state.users)}</tbody></table></div><div class="form-layout" id="user-form"><form class="form-panel" id="new-user-form"><h2>Create a user</h2><div class="form-grid"><div class="field"><label for="user-name-input">Full name</label><input id="user-name-input" name="name" placeholder="Jamie Parker" minlength="2" maxlength="100" required /></div><div class="field"><label for="user-email-input">Work email</label><input id="user-email-input" name="email" type="email" placeholder="jamie@company.com" maxlength="190" required /></div><div class="field"><label for="user-password-input">Temporary password</label><input id="user-password-input" name="password" type="password" placeholder="At least 12 characters" minlength="12" maxlength="128" required /></div><div class="field"><label for="user-role-input">Profile</label><select id="user-role-input" name="role">${ROLE_DEFINITIONS.map((role) => `<option value="${esc(role.id)}">${esc(role.label)}</option>`).join("")}</select></div></div><div class="form-actions"><button class="button button-primary" type="submit">Create user ${icon("arrow")}</button><span class="form-message">Temporary credentials must be rotated at first sign-in.</span></div></form><aside class="info-rail"><h3>Access hygiene</h3><p>Profiles define what each operator can see and change. Never share a permanent password through chat.</p><ul><li>Use a unique temporary password.</li><li>Assign the least privilege needed.</li><li>Review inactive accounts monthly.</li></ul></aside></div>`;
}

function permissionRows() {
  return ROLE_DEFINITIONS.map((role) => `<tr><th scope="row"><span class="record-title">${esc(role.label)}</span><span class="record-subtitle">${esc(role.description)}</span></th>${PERMISSION_DEFINITIONS.map((permission) => { const checked = (state.permissions[role.id] || []).includes(permission.id); return `<td><label class="permission-toggle"><input type="checkbox" data-permission-role="${esc(role.id)}" data-permission="${esc(permission.id)}" ${checked ? "checked" : ""} aria-label="${esc(role.label)}: ${esc(permission.label)}" /><span></span></label></td>`; }).join("")}</tr>`).join("");
}

function renderPermissions() {
  if (!canManageRoles()) return `${shellHeader("Administration / restricted", "Permissions", "Only administrators can configure role permissions.")}<div class="empty-state access-denied">${icon("lock")}<strong>Access restricted</strong><p>Ask an administrator to review role policies.</p></div>`;
  return `${shellHeader("Administration / role policy", "Permissions", "Configure the access matrix once, then assign the right profile to each user.")}<form class="permissions-panel" id="permissions-form"><div class="permissions-intro"><div><p class="kicker">Least privilege</p><h2>Role access matrix</h2><p>Permissions are grouped by capability. A user receives the permissions of their assigned profile.</p></div><button class="button button-primary" type="submit">Save permission policy ${icon("check")}</button></div><div class="permission-table-wrap"><table class="permission-table"><thead><tr><th>Profile</th>${PERMISSION_DEFINITIONS.map((permission) => `<th title="${esc(permission.label)}">${esc(permission.label)}</th>`).join("")}</tr></thead><tbody>${permissionRows()}</tbody></table></div><p class="form-message">Changes are local to this safe demo. Production saves require an administrator session and CSRF token.</p></form>`;
}

const routes = { overview: renderOverview, warranties: renderWarranties, inventory: renderInventory, traceability: renderTraceability, users: renderUsers, permissions: renderPermissions };
function navigate(route = "overview") {
  const safeRoute = routes[route] ? route : "overview"; activeRoute = safeRoute; view.innerHTML = routes[safeRoute]();
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.route === safeRoute));
  document.querySelector("#breadcrumb-current").textContent = safeRoute[0].toUpperCase() + safeRoute.slice(1);
  if (window.location.hash.slice(1) !== safeRoute) window.location.hash = safeRoute;
  bindViewEvents();
}

function bindViewEvents() {
  document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => { navigate(button.dataset.route); document.querySelector("#sidebar").classList.remove("is-open"); }));
  document.querySelectorAll("[data-scroll]").forEach((button) => button.addEventListener("click", () => document.querySelector(`#${button.dataset.scroll}`)?.scrollIntoView({ behavior: "smooth", block: "start" })));
  document.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => { try { await navigator.clipboard.writeText(button.dataset.copy); toast(`${button.dataset.copy} copied to clipboard.`); } catch { toast(button.dataset.copy); } }));
  const warrantySearch = document.querySelector("#warranty-search"); warrantySearch?.addEventListener("input", () => { const term = warrantySearch.value.toLowerCase(); document.querySelector("#warranty-rows").innerHTML = warrantyRows(state.warranties.filter((item) => Object.values(item).some((value) => String(value).toLowerCase().includes(term)))); });
  const assetSearch = document.querySelector("#asset-search"); assetSearch?.addEventListener("input", () => { const term = assetSearch.value.toLowerCase(); document.querySelector("#asset-rows").innerHTML = assetRows(state.assets.filter((item) => Object.values(item).some((value) => String(value).toLowerCase().includes(term)))); });
  const userSearch = document.querySelector("#user-search"); userSearch?.addEventListener("input", () => { const term = userSearch.value.toLowerCase(); document.querySelector("#user-rows").innerHTML = userRows(state.users.filter((item) => Object.values(item).some((value) => String(value).toLowerCase().includes(term)))); });
  document.querySelector("#new-warranty-form")?.addEventListener("submit", createWarranty);
  document.querySelector("#new-transfer-form")?.addEventListener("submit", transferAsset);
  document.querySelector("#new-user-form")?.addEventListener("submit", createUser);
  document.querySelector("#permissions-form")?.addEventListener("submit", savePermissions);
  document.querySelectorAll("[data-user-info]").forEach((button) => button.addEventListener("click", () => toast(`${button.dataset.userInfo} · profile details are visible in the users table.`)));
}

async function createWarranty(event) {
  event.preventDefault(); const form = new FormData(event.currentTarget); const project = String(form.get("project")).trim().toUpperCase(); const customer = String(form.get("customer")).trim(); const site = String(form.get("site")).trim();
  const validation = validateWarrantyInput({ project, customer, site });
  if (!validation.valid) { toast(validation.message, true); return; }
  const normalized = validation.value;
  try {
    let item;
    if (runtime.demoMode) { const id = `WAR-${new Date().getFullYear()}-${String(state.warranties.length + 19).padStart(3, "0")}`; item = { id, ...normalized, type: form.get("type"), issued: form.get("issued") || new Date().toISOString().slice(0, 10), status: "Issued" }; state.warranties.unshift(item); state.activity.unshift({ title: "Warranty certificate issued", detail: `${id} · ${normalized.customer}`, time: "Just now" }); saveState(); toast(`${id} issued in local demo mode.`); navigate("warranties"); return; }
    await apiRequest("warranties", { method: "POST", body: JSON.stringify({ ...Object.fromEntries(form.entries()), ...normalized }) }); state = await loadRemoteState(); toast("Warranty record issued securely."); navigate("warranties");
  } catch (error) { toast(error.message || "The warranty could not be issued.", true); }
}

async function transferAsset(event) {
  event.preventDefault(); const form = new FormData(event.currentTarget); const asset = state.assets.find((item) => item.id === form.get("asset"));
  const validation = validateTransferInput({ asset, destination: form.get("destination"), custodian: form.get("custodian") });
  if (!validation.valid) { toast(validation.message, true); return; }
  try {
    if (runtime.demoMode) { asset.location = validation.value.destination; asset.owner = validation.value.custodian; asset.status = "Checked out"; state.activity.unshift({ title: "Asset handoff recorded", detail: `${asset.id} · ${asset.location}`, time: "Just now" }); saveState(); toast(`${asset.id} moved to ${asset.location}.`); navigate("inventory"); return; }
    await apiRequest("transfers", { method: "POST", body: JSON.stringify({ assetId: asset.id, ...validation.value }) }); state = await loadRemoteState(); toast(`${asset.id} handoff recorded securely.`); navigate("inventory");
  } catch (error) { toast(error.message || "The handoff could not be recorded.", true); }
}

async function createUser(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const validation = validateUserInput({ name: form.get("name"), email: form.get("email"), role: form.get("role"), password: form.get("password") });
  if (!validation.valid) { toast(validation.message, true); return; }
  if (state.users.some((user) => user.email === validation.value.email)) { toast("A user with that email already exists.", true); return; }
  try {
    if (runtime.demoMode) {
      const user = { id: `usr-${Date.now()}`, name: validation.value.name, email: validation.value.email, role: validation.value.role, status: "Active", lastAccess: "Never" };
      state.users.unshift(user); state.activity.unshift({ title: "User profile created", detail: `${user.name} · ${roleLabel(user.role)}`, time: "Just now" }); saveState(); toast(`${user.name} was added to the workspace.`); navigate("users"); return;
    }
    await apiRequest("users", { method: "POST", body: JSON.stringify(validation.value) }); state = await loadRemoteState(); toast("User created securely."); navigate("users");
  } catch (error) { toast(error.message || "The user could not be created.", true); }
}

async function savePermissions(event) {
  event.preventDefault();
  const permissions = {};
  ROLE_DEFINITIONS.forEach((role) => { permissions[role.id] = [...document.querySelectorAll(`[data-permission-role="${role.id}"]:checked`)].map((input) => input.dataset.permission); });
  try {
    if (runtime.demoMode) { state.permissions = permissions; saveState(); toast("Permission policy saved in this browser."); return; }
    await apiRequest("permissions", { method: "PUT", body: JSON.stringify({ permissions }) }); state.permissions = permissions; toast("Permission policy saved securely.");
  } catch (error) { toast(error.message || "The permission policy could not be saved.", true); }
}

async function signOut() {
  try { if (!runtime.demoMode) await apiRequest("logout", { method: "POST" }); } catch { /* always clear the local session */ }
  currentUser = null; csrfToken = ""; try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } document.querySelector("#user-menu").classList.remove("is-open"); renderLogin();
}

async function boot() {
  if (runtime.demoMode) {
    try {
      const storedUser = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      currentUser = storedUser ? { ...storedUser, role: storedUser.role === "Operations admin" ? "admin" : storedUser.role } : null;
    } catch { currentUser = null; }
    if (currentUser) { await enterWorkspace(); } else renderLogin();
    return;
  }
  try { const response = await apiRequest("session"); currentUser = response.user; await enterWorkspace(); } catch (error) { renderLogin(error.status && error.status !== 401 ? "The secure service is unavailable. Try again or contact the administrator." : ""); }
}

document.querySelector("#menu-button").addEventListener("click", () => document.querySelector("#sidebar").classList.toggle("is-open"));
document.querySelector("#user-menu-button").addEventListener("click", () => { const menu = document.querySelector("#user-menu"); menu.classList.toggle("is-open"); document.querySelector("#user-menu-button").setAttribute("aria-expanded", menu.classList.contains("is-open")); });
document.querySelector("#logout-button").addEventListener("click", signOut);
document.querySelector("#reset-demo").addEventListener("click", () => { if (!runtime.demoMode) { toast("Demo reset is disabled in production mode.", true); return; } state = cloneSeed(); saveState(); navigate(window.location.hash.slice(1) || "overview"); toast("Demo data reset."); });
window.addEventListener("hashchange", () => { const route = window.location.hash.slice(1) || "overview"; if (currentUser && route !== activeRoute) navigate(route); });
boot();
