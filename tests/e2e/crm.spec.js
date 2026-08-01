import { expect, test } from "@playwright/test";

const credentials = {
  email: "demo@orius.local",
  password: "SolarOps!Demo#2026_X7",
};

async function signIn(page) {
  await page.goto("/");
  await page.getByLabel("Work email").fill(credentials.email);
  await page.locator("#login-password").fill(credentials.password);
  await page.getByRole("button", { name: /Sign in/ }).click();
  await expect(page.locator("#auth-view")).toBeHidden();
  await expect(page.locator("#app-shell")).toBeVisible();
}

test("signs in and renders only the authenticated dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#auth-view")).toBeVisible();
  await expect(page.locator("#app-shell")).toBeHidden();
  await signIn(page);
  await expect(page.getByRole("heading", { name: /Solar operations/ })).toBeVisible();
  await expect(page.getByText("Local demo adapter")).toBeVisible();
  await expect(page.getByRole("button", { name: "Users" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Permissions" })).toBeVisible();
});

test("starts a privacy-safe password recovery request", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await page.locator("#recovery-email").fill("someone@example.test");
  await page.getByRole("button", { name: /Send recovery link/ }).click();
  await expect(page.locator("#recovery-message")).toContainText("If the account exists");
});

test("creates a warranty and records an asset transfer", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Warranties" }).click();
  await expect(page.getByRole("heading", { name: "Warranties" })).toBeVisible();
  await page.locator("#project").fill("OR-019");
  await page.locator("#customer").fill("Jordan Lee");
  await page.locator("#site").fill("123 Solar Way, Phoenix AZ");
  await page.locator("#issued").fill("2026-08-01");
  await page.getByRole("button", { name: /Issue certificate/ }).click();
  await expect(page.locator("#warranty-rows")).toContainText("Jordan Lee");

  await page.getByRole("button", { name: "Inventory" }).click();
  await page.locator("#destination").fill("Van OR-05");
  await page.locator("#custodian").fill("Crew Horizon");
  await page.getByRole("button", { name: /Save handoff/ }).click();
  await expect(page.locator("#asset-rows")).toContainText("Van OR-05");
});

test("creates a user and updates the demo permission matrix", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Users" }).click();
  await page.locator("#user-name-input").fill("Jamie Parker");
  await page.locator("#user-email-input").fill("jamie@example.test");
  await page.locator("#user-password-input").fill("LongTemporary!2026");
  await page.locator("#user-role-input").selectOption("manager");
  await page.locator("#new-user-form button[type=submit]").click();
  await expect(page.locator("#user-rows")).toContainText("Jamie Parker");

  await page.getByRole("button", { name: "Permissions" }).click();
  const transferPermission = page.locator('[data-permission-role="viewer"][data-permission="inventory.transfer"]');
  await transferPermission.check({ force: true });
  await page.getByRole("button", { name: /Save permission policy/ }).click();
  await expect(page.locator("#toast-region")).toContainText("Permission policy saved");
});

test("signs out and returns to the login screen", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: /Open user menu/ }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.locator("#auth-view")).toBeVisible();
  await expect(page.locator("#app-shell")).toBeHidden();
});
