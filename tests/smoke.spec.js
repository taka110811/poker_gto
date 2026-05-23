const { expect, test } = require("@playwright/test");

test("loads solver workspace and solves a random spot", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });

  await page.goto("/?testMode=1");

  await expect(page).toHaveTitle("Poker GTO Solver Studio");
  await expect(page.getByRole("heading", { name: "Poker GTO Solver Studio" })).toBeVisible();
  await expect(page.getByText("Approx EV")).toBeVisible();
  await expect(page.getByText("Chip EV")).toBeVisible();
  await expect(page.getByRole("button", { name: "OOP Range" })).toBeVisible();
  await expect(page.getByRole("button", { name: "IP Range" })).toBeVisible();

  await page.getByRole("button", { name: "IP Range" }).click();
  await page.getByText("AA").click();
  await expect(page.locator("#comboCount")).toContainText("IP");
  await expect(page.getByRole("button", { name: "75% pot" })).toBeVisible();
  await page.getByRole("button", { name: "125% pot" }).click();

  await page.getByRole("button", { name: "Random spot" }).click();
  await page.getByRole("button", { name: "Solve Spot" }).click();

  await expect(page.locator("#equity")).not.toHaveText("--", { timeout: 10000 });
  await expect(page.locator("#actionFrequency")).not.toHaveText("--");
  await expect(page.locator("#oopBetFreq")).not.toHaveText("--", { timeout: 10000 });
  await expect(page.locator("#ipCallFreq")).not.toHaveText("--");
  await expect(page.locator("#sizeResults")).toContainText("33% pot");
  await expect(page.locator("#sizeResults")).toContainText("125% pot");
  expect(pageErrors).toEqual([]);
});
