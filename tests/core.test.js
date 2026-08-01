import { describe, expect, it } from "vitest";
import {
  DEMO_CREDENTIALS,
  DEFAULT_PERMISSIONS,
  ROLE_DEFINITIONS,
  escapeHtml,
  formatDate,
  isValidDemoCredentials,
  roleLabel,
  statusClass,
  validateTransferInput,
  validatePasswordResetInput,
  validateUserInput,
  validateWarrantyInput,
} from "../portal/core.js";

describe("core CRM rules", () => {
  it("escapes user-controlled HTML characters", () => {
    expect(escapeHtml(`<script>alert('x')</script>`)).toBe("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
  });

  it("formats dates deterministically for the operations UI", () => {
    expect(formatDate("2024-06-18")).toBe("Jun 18, 2024");
  });

  it("maps known statuses to semantic UI classes", () => {
    expect(statusClass("Issued")).toBe("status-green");
    expect(statusClass("Checked out")).toBe("status-amber");
    expect(statusClass("unknown")).toBe("status-cyan");
  });

  it("accepts only the documented synthetic demo credentials", () => {
    expect(isValidDemoCredentials(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password)).toBe(true);
    expect(isValidDemoCredentials(DEMO_CREDENTIALS.email, "wrong-password")).toBe(false);
    expect(isValidDemoCredentials(" DEMO@ORIUS.LOCAL ", DEMO_CREDENTIALS.password)).toBe(true);
  });

  it("validates and normalizes warranty input", () => {
    expect(validateWarrantyInput({ project: " or-019 ", customer: "  Jordan Lee ", site: "123 Solar Way, Phoenix AZ" })).toEqual({
      valid: true,
      value: { project: "OR-019", customer: "Jordan Lee", site: "123 Solar Way, Phoenix AZ" },
    });
    expect(validateWarrantyInput({ project: "19", customer: "Jordan Lee", site: "123 Solar Way" }).valid).toBe(false);
    expect(validateWarrantyInput({ project: "OR-019", customer: "", site: "123 Solar Way" }).valid).toBe(false);
    expect(validateWarrantyInput({ project: "OR-019", customer: "x".repeat(101), site: "123 Solar Way" }).valid).toBe(false);
    expect(validateWarrantyInput({ project: "OR-019", customer: "Jordan Lee", site: "x".repeat(181) }).valid).toBe(false);
    expect(validateWarrantyInput({ project: "OR-019", customer: "Jordan Lee", site: "short" }).valid).toBe(false);
  });

  it("validates transfer input and rejects missing assets", () => {
    expect(validateTransferInput({ asset: { id: "TL-042" }, destination: " Van OR-05 ", custodian: " Crew Horizon " })).toEqual({
      valid: true,
      value: { destination: "Van OR-05", custodian: "Crew Horizon" },
    });
    expect(validateTransferInput({ asset: null, destination: "Van OR-05", custodian: "Crew Horizon" }).valid).toBe(false);
    expect(validateTransferInput({ asset: { id: "TL-042" }, destination: "", custodian: "Crew Horizon" }).valid).toBe(false);
    expect(validateTransferInput({ asset: { id: "TL-042" }, destination: "x".repeat(101), custodian: "Crew Horizon" }).valid).toBe(false);
    expect(validateTransferInput({ asset: { id: "TL-042" }, destination: "Van OR-05", custodian: "x".repeat(101) }).valid).toBe(false);
    expect(validateTransferInput({ asset: { id: "TL-042" }, destination: "Van OR-05", custodian: "" }).valid).toBe(false);
  });

  it("validates account recovery without revealing account existence", () => {
    expect(validatePasswordResetInput({ email: " DEMO@ORIUS.LOCAL " })).toEqual({ valid: true, value: { email: "demo@orius.local" } });
    expect(validatePasswordResetInput({ email: "not-an-email" }).valid).toBe(false);
    expect(validatePasswordResetInput({ email: "x".repeat(191) + "@example.test" }).valid).toBe(false);
  });

  it("validates user creation and exposes documented role labels", () => {
    expect(validateUserInput({ name: " Jamie Parker ", email: "JAMIE@EXAMPLE.TEST", role: "manager", password: "LongTemporary!2026" })).toEqual({
      valid: true,
      value: { name: "Jamie Parker", email: "jamie@example.test", role: "manager", password: "LongTemporary!2026" },
    });
    expect(validateUserInput({ name: "Jamie", email: "jamie@example.test", role: "unknown", password: "LongTemporary!2026" }).valid).toBe(false);
    expect(validateUserInput({ name: "Jamie", email: "jamie@example.test", role: "manager", password: "short" }).valid).toBe(false);
    expect(validateUserInput({ name: "", email: "jamie@example.test", role: "manager", password: "LongTemporary!2026" }).valid).toBe(false);
    expect(validateUserInput({ name: "Jamie", email: "not-an-email", role: "manager", password: "LongTemporary!2026" }).valid).toBe(false);
    expect(validateUserInput({ name: "Jamie", email: "jamie@example.test", role: "manager", password: "x".repeat(129) }).valid).toBe(false);
    expect(roleLabel("admin")).toBe("Administrator");
    expect(ROLE_DEFINITIONS).toHaveLength(5);
    expect(DEFAULT_PERMISSIONS.admin).toContain("roles.manage");
  });
});
