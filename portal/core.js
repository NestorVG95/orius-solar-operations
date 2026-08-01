export const DEMO_CREDENTIALS = Object.freeze({
  email: "demo@orius.local",
  password: "SolarOps!Demo#2026_X7",
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
