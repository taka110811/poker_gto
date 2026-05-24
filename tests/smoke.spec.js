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
  await expect(page.locator("#rangeEditor")).toHaveClass(/is-collapsed/);
  await expect(page.locator("#rangeSummary")).toContainText("OOP Range");
  await page.getByRole("button", { name: "詳細編集を開く" }).click();
  await expect(page.locator("#rangeEditor")).not.toHaveClass(/is-collapsed/);

  await page.getByRole("button", { name: "IP Range" }).click();
  await expect(page.locator("#rangeFeedback")).toHaveText("IP Range を編集中");
  await page.getByText("AA").click();
  await expect(page.locator("#comboCount")).toContainText("IP");
  await expect(page.locator("#rangeFeedback")).toHaveText("IP AA を 0% に変更");

  await page.locator("#hero-0").selectOption("Kh");
  await page.locator("#hero-1").selectOption("Qd");
  await page.locator("#board-0").selectOption("Ah");
  await page.locator("#board-1").selectOption("8d");
  await page.locator("#board-2").selectOption("4c");
  await page.locator("#board-3").selectOption("2h");
  await page.locator("#board-4").selectOption("7s");
  await expect(page.getByRole("button", { name: "75% pot" })).toBeVisible();
  await page.getByRole("button", { name: "125% pot" }).click();
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
  await expect(page.locator("#turnStatus")).toContainText("6 iterations");
  await expect(page.locator("#turnStatus")).toContainText("16 combo cap");
  await expect(page.locator("#turnStatus")).toContainText("ms");
  await expect(page.locator("#turnOopBetFreq")).not.toHaveText("--");
  await expect(page.locator("#turnOopCheckFreq")).not.toHaveText("--");
  await expect(page.locator("#turnIpCallFreq")).not.toHaveText("--");
  await expect(page.locator("#turnIpProbeFreq")).not.toHaveText("--");
  await expect(page.locator("#turnOopCallFreq")).not.toHaveText("--");
  await expect(page.locator("#turnBestRiver")).not.toHaveText("--");
  await expect(page.locator("#turnRangeCap")).toHaveText("16 combos");
  await expect(page.locator("#turnSolverSettings")).toHaveText("6 iter / 4 runouts / 16 combos");
  await expect(page.locator("#turnCalcTime")).toContainText("ms");
  await expect(page.locator("#turnAccuracy")).toHaveText("Lite: 4/4 runouts, 16 combo cap");
  await expect(page.locator("#turnRunoutRows tr")).toHaveCount(4);
  await expect(page.locator("#turnRunoutRows tr").first().locator("td")).toHaveCount(7);
  await expect(page.locator("#riverStatus")).toHaveText("Board 5枚で有効");
  expect(pageErrors).toEqual([]);
});

test("shows flop solver lite texture and turn samples", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await page.goto("/?testMode=1");

  await page.locator("#hero-0").selectOption("Kh");
  await page.locator("#hero-1").selectOption("Qd");
  await page.locator("#board-0").selectOption("Ah");
  await page.locator("#board-1").selectOption("8d");
  await page.locator("#board-2").selectOption("4c");
  await page.getByRole("button", { name: "Solve Spot" }).click();

  await expect(page.locator("#flopStatus")).toContainText("4 turn samples");
  await expect(page.locator("#flopTexture")).toContainText("A-high");
  await expect(page.locator("#flopOopScore")).not.toHaveText("--");
  await expect(page.locator("#flopIpScore")).not.toHaveText("--");
  await expect(page.locator("#flopRangeAdvantage")).not.toHaveText("--");
  await expect(page.locator("#flopOopCbet")).not.toHaveText("--");
  await expect(page.locator("#flopOopCheck")).not.toHaveText("--");
  await expect(page.locator("#flopIpContinue")).not.toHaveText("--");
  await expect(page.locator("#flopRunoutVolatility")).not.toHaveText("--");
  await expect(page.locator("#flopTurnSamples")).toHaveText("4");
  await expect(page.locator("#flopAccuracy")).toHaveText("Lite: heuristic strategy, 4 turn cap, 24 combo cap");
  await expect(page.locator("#flopTurnRows tr")).toHaveCount(4);
  await expect(page.locator("#turnStatus")).toHaveText("Board 4枚で有効");
  await expect(page.locator("#riverStatus")).toHaveText("Board 5枚で有効");
  expect(pageErrors).toEqual([]);
});

test("keeps the solver workspace usable on mobile width", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?testMode=1");

  await expect(page.getByRole("navigation", { name: "Workspace sections" })).toBeVisible();
  await expect(page.locator("#streetSummary")).toHaveText("No board");
  await expect(page.locator("#setupPanel")).toBeVisible();
  await expect(page.locator("#tablePanel")).toBeVisible();
  await expect(page.locator("#resultsPanel")).toBeVisible();

  const layout = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    setupWidth: Math.ceil(document.querySelector("#setupPanel").getBoundingClientRect().width),
    tableWidth: Math.ceil(document.querySelector("#tablePanel").getBoundingClientRect().width),
    resultsWidth: Math.ceil(document.querySelector("#resultsPanel").getBoundingClientRect().width),
    rangeMatrixWidth: Math.ceil(document.querySelector("#rangeMatrix").getBoundingClientRect().width),
  }));

  expect(layout.bodyScrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.setupWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.tableWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.resultsWidth).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.rangeMatrixWidth).toBeLessThanOrEqual(layout.clientWidth);

  await page.locator("#hero-0").selectOption("Kh");
  await page.locator("#hero-1").selectOption("Qd");
  await page.locator("#board-0").selectOption("Ah");
  await page.locator("#board-1").selectOption("8d");
  await page.locator("#board-2").selectOption("4c");
  await expect(page.locator("#streetSummary")).toHaveText("Flop");
  await expect(page.locator("#setupStatus")).toHaveText("Flop計算可能");
  await expect(page.locator("#flopPanel")).toHaveClass(/is-active/);
  await expect(page.locator("#turnPanel")).toHaveClass(/is-inactive/);
  await expect(page.locator('.view-nav a[href="#flopPanel"]')).toHaveClass(/active/);

  expect(pageErrors).toEqual([]);
});

test("moves mobile users to the relevant solver after solve", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?testMode=1");

  await page.locator("#hero-0").selectOption("Kh");
  await page.locator("#hero-1").selectOption("Qd");
  await page.locator("#board-0").selectOption("Ah");
  await page.locator("#board-1").selectOption("8d");
  await page.locator("#board-2").selectOption("4c");
  await page.locator("#board-3").selectOption("2h");
  await expect(page.locator("#setupStatus")).toHaveText("Turn計算可能");

  await page.getByRole("button", { name: "Solve Spot" }).click();
  await expect(page.locator("#turnStatus")).toContainText("runouts", { timeout: 10000 });
  await page.waitForFunction(() => Math.abs(document.querySelector("#turnPanel").getBoundingClientRect().top) < 140);

  const scrollPosition = await page.evaluate(() => ({
    scrollY: window.scrollY,
    turnTop: document.querySelector("#turnPanel").getBoundingClientRect().top,
  }));
  expect(scrollPosition.scrollY).toBeGreaterThan(0);
  expect(Math.abs(scrollPosition.turnTop)).toBeLessThan(140);
  expect(pageErrors).toEqual([]);
});
