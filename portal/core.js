export const DEMO_CREDENTIALS = Object.freeze({
  email: "demo@orius.local",
  password: "SolarOps!Demo#2026_X7",
});

export const ROLE_DEFINITIONS = Object.freeze([
  { id: "admin", label: "Administrator", description: "Full access, including roles and security settings." },
  { id: "operations_admin", label: "Operations admin", description: "Manages operational records and team members." },
  { id: "manager", label: "Manager", description: "Creates warranties and supervises field activity." },
  { id: "warehouse", label: "Warehouse", description: "Controls inventory and asset custody." },
  { id: "viewer", label: "Viewer", description: "Read-only access to approved records." },
]);

export const PERMISSION_DEFINITIONS = Object.freeze([
  { id: "dashboard.view", label: "View dashboard" },
  { id: "warranties.read", label: "View warranties" },
  { id: "warranties.create", label: "Create warranties" },
  { id: "inventory.read", label: "View inventory" },
  { id: "inventory.transfer", label: "Transfer assets" },
  { id: "traceability.read", label: "View traceability" },
  { id: "users.manage", label: "Manage users" },
  { id: "roles.manage", label: "Configure permissions" },
]);

export const DEFAULT_PERMISSIONS = Object.freeze({
  admin: PERMISSION_DEFINITIONS.map(({ id }) => id),
  operations_admin: ["dashboard.view", "warranties.read", "warranties.create", "inventory.read", "inventory.transfer", "traceability.read", "users.manage"],
  manager: ["dashboard.view", "warranties.read", "warranties.create", "inventory.read", "inventory.transfer", "traceability.read"],
  warehouse: ["dashboard.view", "warranties.read", "inventory.read", "inventory.transfer", "traceability.read"],
  viewer: ["dashboard.view", "warranties.read", "inventory.read", "traceability.read"],
});

export const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
}[char]));

export const formatDate = (date) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date(`${date}T12:00:00`));

export const statusClass = (status) => ({
  Issued: "status-green",
  Review: "status-amber",
  Ready: "status-cyan",
  "Checked out": "status-amber",
}[status] || "status-cyan");

export const isValidDemoCredentials = (email, password) => (
  email.trim().toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password
);

export const validateWarrantyInput = ({ project, customer, site }) => {
  const normalizedProject = String(project || "").trim().toUpperCase();
  const normalizedCustomer = String(customer || "").trim();
  const normalizedSite = String(site || "").trim();
  if (!/^OR-[0-9]{3}$/.test(normalizedProject)) return { valid: false, message: "Project number must look like OR-019." };
  if (normalizedCustomer.length < 2 || normalizedCustomer.length > 100) return { valid: false, message: "Customer name must be between 2 and 100 characters." };
  if (normalizedSite.length < 8 || normalizedSite.length > 180) return { valid: false, message: "Building address must be between 8 and 180 characters." };
  return { valid: true, value: { project: normalizedProject, customer: normalizedCustomer, site: normalizedSite } };
};

export const validateTransferInput = ({ asset, destination, custodian }) => {
  const normalizedDestination = String(destination || "").trim();
  const normalizedCustodian = String(custodian || "").trim();
  if (!asset) return { valid: false, message: "Select an asset before recording the handoff." };
  if (!normalizedDestination || normalizedDestination.length > 100) return { valid: false, message: "Destination is required and must be 100 characters or fewer." };
  if (!normalizedCustodian || normalizedCustodian.length > 100) return { valid: false, message: "Custodian is required and must be 100 characters or fewer." };
  return { valid: true, value: { destination: normalizedDestination, custodian: normalizedCustodian } };
};

export const validateUserInput = ({ name, email, role, password }) => {
  const normalizedName = String(name || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedRole = String(role || "").trim();
  const normalizedPassword = String(password || "");
  if (normalizedName.length < 2 || normalizedName.length > 100) return { valid: false, message: "Name must be between 2 and 100 characters." };
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || normalizedEmail.length > 190) return { valid: false, message: "Enter a valid work email." };
  if (!ROLE_DEFINITIONS.some(({ id }) => id === normalizedRole)) return { valid: false, message: "Select a valid profile." };
  if (normalizedPassword.length < 12 || normalizedPassword.length > 128) return { valid: false, message: "Password must be between 12 and 128 characters." };
  return { valid: true, value: { name: normalizedName, email: normalizedEmail, role: normalizedRole, password: normalizedPassword } };
};

export const validatePasswordResetInput = ({ email }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || normalizedEmail.length > 190) return { valid: false, message: "Enter a valid work email." };
  return { valid: true, value: { email: normalizedEmail } };
};

export const roleLabel = (role) => ROLE_DEFINITIONS.find((item) => item.id === role)?.label || role;
