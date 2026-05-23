const { expect, test } = require("@playwright/test");

function collectPageErrors(page) {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  return pageErrors;
}

test("loads solver workspace and solves a deterministic approximate spot", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await page.goto("/?testMode=1");

  await expect(page).toHaveTitle("Poker GTO Solver Studio");
  await expect(page.getByRole("heading", { name: "Poker GTO Solver Studio" })).toBeVisible();
  await expect(page.getByLabel("Solver configuration").getByText("Approx EV")).toBeVisible();
  await expect(page.getByText("Chip EV")).toBeVisible();
  await expect(page.locator(".source-badge", { hasText: "Approx EV" })).toBeVisible();
  await expect(page.locator(".source-badge", { hasText: "Live CFR" })).toBeVisible();
  await expect(page.locator(".source-badge", { hasText: "Precomputed DB" })).toBeVisible();
  await expect(page.getByText("Solved Spot Reference")).toBeVisible();
  await expect(page.getByRole("button", { name: "OOP Range" })).toBeVisible();
  await expect(page.getByRole("button", { name: "IP Range" })).toBeVisible();

  await page.getByRole("button", { name: "IP Range" }).click();
  await page.getByText("AA").click();
  await expect(page.locator("#comboCount")).toContainText("IP");
  await expect(page.getByRole("button", { name: "75% pot" })).toBeVisible();
  await page.getByRole("button", { name: "125% pot" }).click();

  await page.locator("#hero-0").selectOption("Kh");
  await page.locator("#hero-1").selectOption("Qd");
  await page.locator("#board-0").selectOption("Ah");
  await page.locator("#board-1").selectOption("8d");
  await page.locator("#board-2").selectOption("4c");
  await page.locator("#board-3").selectOption("2h");
  await page.locator("#board-4").selectOption("7s");
  await page.getByRole("button", { name: "Solve Spot" }).click();

  await expect(page.locator("#equity")).not.toHaveText("--", { timeout: 10000 });
  await expect(page.locator("#actionFrequency")).not.toHaveText("--");
  await expect(page.locator("#oopBetFreq")).not.toHaveText("--", { timeout: 10000 });
  await expect(page.locator("#ipCallFreq")).not.toHaveText("--");
  await expect(page.locator("#sizeResults")).toContainText("33% pot");
  await expect(page.locator("#sizeResults")).toContainText("125% pot");
  await expect(page.locator("#precomputedStatus")).toContainText("Approx");
  await expect(page.locator("#precomputedRecord")).toContainText("btn-bb-srp-river");
  await expect(page.locator("#precomputedSpot")).not.toHaveText("--");
  await expect(page.locator("#precomputedSpot")).toContainText("river-no-raise-33-75");
  await expect(page.locator("#precomputedSolver")).toContainText("sample-precompute");
  await expect(page.locator("#precomputedDbStats")).toContainText("5 spots");
  await expect(page.locator("#precomputedDbStats")).toContainText("KB");
  await expect(page.locator("#precomputedActions")).toContainText("%");
  await expect(page.locator("#precomputedActionRows tr")).toHaveCount(3);
  await expect(page.locator("#precomputedActionRows")).toContainText("Bet");
  await page.getByRole("button", { name: "Solve Spot" }).click();
  await expect(page.locator("#riverStatus")).toContainText("cached");
  expect(pageErrors).toEqual([]);
});

test("shows exact precomputed reference for seeded river board", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await page.goto("/?testMode=1");

  await page.locator("#stack").fill("100");
  await page.locator("#board-0").selectOption("As");
  await page.locator("#board-1").selectOption("9d");
  await page.locator("#board-2").selectOption("4c");
  await page.locator("#board-3").selectOption("2h");
  await page.locator("#board-4").selectOption("7s");

  await expect(page.locator("#precomputedStatus")).toHaveText("Exact precomputed spot");
  await expect(page.locator("#precomputedRecord")).toHaveText("btn-bb-srp-river-ahigh-dry-100bb");
  await expect(page.locator("#precomputedSolver")).toContainText("2026-05-foundation");
  await expect(page.locator("#precomputedDbStats")).toContainText("5 spots");
  await expect(page.locator("#precomputedActionRows tr")).toHaveCount(3);
  expect(pageErrors).toEqual([]);
});

test("solves a turn spot by rolling out capped river cards", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await page.goto("/?testMode=1");

  await page.locator("#hero-0").selectOption("Kh");
  await page.locator("#hero-1").selectOption("Qd");
  await page.locator("#board-0").selectOption("Ah");
  await page.locator("#board-1").selectOption("8d");
  await page.locator("#board-2").selectOption("4c");
  await page.locator("#board-3").selectOption("2h");
  await page.getByRole("button", { name: "Solve Spot" }).click();

  await expect(page.locator("#turnStatus")).toContainText("runouts", { timeout: 10000 });
  await expect(page.locator("#turnRunouts")).toHaveText("4");
  await expect(page.locator("#turnOopBetFreq")).not.toHaveText("--");
  await expect(page.locator("#turnIpCallFreq")).not.toHaveText("--");
  await expect(page.locator("#turnBestRiver")).not.toHaveText("--");
  await expect(page.locator("#turnRangeCap")).toHaveText("16 combos");
  await expect(page.locator("#turnRunoutRows tr")).toHaveCount(4);
  await expect(page.locator("#riverStatus")).toHaveText("Board 5枚で有効");
  expect(pageErrors).toEqual([]);
});
