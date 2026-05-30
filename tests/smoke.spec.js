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
  await expect(page.locator(".source-badge", { hasText: "Rollout Lite" })).toBeVisible();
  await expect(page.locator(".source-badge", { hasText: "Heuristic Lite" })).toBeVisible();
  await expect(page.locator(".source-badge", { hasText: "River Reference DB" })).toBeVisible();
  await expect(page.getByText("River Solved Spot Reference")).toBeVisible();
  await expect(page.getByLabel("River solver scope")).toContainText("Board 5枚で有効");
  await expect(page.getByLabel("Turn solver scope")).toContainText("Board 4枚で有効");
  await expect(page.getByLabel("Flop solver scope")).toContainText("Board 3枚で有効");
  await expect(page.getByLabel("Reference DB scope")).toContainText("River中心");
  await expect(page.getByText("Preflop Spot Browser")).toBeVisible();
  await expect(page.locator("#preflopSpotCount")).toHaveText("3 setups");
  await expect(page.getByRole("button", { name: "OOP Range" })).toBeVisible();
  await expect(page.getByRole("button", { name: "IP Range" })).toBeVisible();
  await expect(page.locator("#rangeEditor")).toHaveClass(/is-collapsed/);
  await expect(page.locator("#rangeSummary")).toContainText("OOP Range");
  await expect(page.getByLabel("Setup range summary")).toContainText("OOP");
  await expect(page.locator("#setupOopRangeSummary")).toContainText("Standard 30%");
  await expect(page.locator("#setupIpRangeSummary")).toContainText("Standard 30%");
  await expect(page.locator("#setupRangeStatus")).toHaveText("Range変更後はSolveで再計算します。");
  await page.getByRole("button", { name: "詳細編集を開く" }).click();
  await expect(page.locator("#rangeEditor")).not.toHaveClass(/is-collapsed/);
  await expect(page.getByLabel("Range metrics")).toContainText("Weighted combos");
  await expect(page.getByLabel("Range frequency palette").getByRole("button", { name: "100%", exact: true })).toHaveClass(/active/);

  await page.getByRole("button", { name: "IP Range" }).click();
  await expect(page.locator("#rangeFeedback")).toHaveText("IP Range を編集中");
  await page.getByLabel("Range frequency palette").getByRole("button", { name: "0%", exact: true }).click();
  await expect(page.locator("#rangeFeedback")).toHaveText("IP 0% を選択");
  await page.getByText("AA").click();
  await expect(page.locator("#comboCount")).toContainText("IP");
  await expect(page.locator("#rangeActiveHands")).not.toHaveText("0");
  await expect(page.locator("#rangeFeedback")).toHaveText("IP AA を 0% に変更");
  await expect(page.locator("#setupIpRangeSummary")).toContainText("Standard 30%");
  await expect(page.locator("#setupIpRangeSummary")).toContainText("combos");
  await expect(page.locator("#setupRangeStatus")).toHaveText("IP AA を 0% に変更。Solveで再計算します。");
  await expect(page.locator("#riverStatus")).toHaveText("Solveで再計算");

  await page.getByLabel("Range frequency palette").getByRole("button", { name: "50%", exact: true }).click();
  const kkBox = await page.locator('.range-cell[data-code="KK"]').boundingBox();
  const qqBox = await page.locator('.range-cell[data-code="QQ"]').boundingBox();
  expect(kkBox).not.toBeNull();
  expect(qqBox).not.toBeNull();
  await page.mouse.move(kkBox.x + kkBox.width / 2, kkBox.y + kkBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(qqBox.x + qqBox.width / 2, qqBox.y + qqBox.height / 2);
  await page.mouse.up();
  await expect(page.locator('.range-cell[data-code="KK"]')).toContainText("50%");
  await expect(page.locator('.range-cell[data-code="QQ"]')).toContainText("50%");

  await page.locator("#hero-0").selectOption("Kh");
  await page.locator("#hero-1").selectOption("Qd");
  await page.locator("#board-0").selectOption("Ah");
  await page.locator("#board-1").selectOption("8d");
  await page.locator("#board-2").selectOption("4c");
  await page.locator("#board-3").selectOption("2h");
  await page.locator("#board-4").selectOption("7s");
  await expect(page.getByRole("button", { name: "75% pot" })).toBeVisible();
  await expect(page.locator("#betTreeKey")).toHaveText("river-no-raise-33-75");
  await expect(page.locator("#betTreeAmounts")).toContainText("33% pot 4.0bb");
  await expect(page.locator("#betTreeAmounts")).toContainText("75% pot 9.0bb");
  await page.getByRole("button", { name: "50% pot" }).click();
  await expect(page.locator("#riverStatus")).toHaveText("Solveで再計算");
  await expect(page.locator("#betTreeKey")).toHaveText("river-no-raise-33-50-75");
  await expect(page.locator("#betTreeAmounts")).toContainText("50% pot 6.0bb");
  await page.getByRole("button", { name: "125% pot" }).click();
  await page.getByRole("button", { name: "Solve Spot" }).click();

  await expect(page.locator("#equity")).not.toHaveText("--", { timeout: 10000 });
  await expect(page.locator("#actionFrequency")).not.toHaveText("--");
  await expect(page.locator("#oopBetFreq")).not.toHaveText("--", { timeout: 10000 });
  await expect(page.locator("#ipCallFreq")).not.toHaveText("--");
  await expect(page.locator("#sizeResults")).toContainText("33% pot");
  await expect(page.locator("#sizeResults")).toContainText("50% pot");
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

test("applies a spot preset and solves the selected street", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await page.goto("/?testMode=1");

  await page.locator("#spotPreset").selectOption("btn-bb-srp-turn");

  await expect(page.locator("#position")).toHaveValue("BTN");
  await expect(page.locator("#villainRange")).toHaveValue("standard");
  await expect(page.locator("#hero-0")).toHaveValue("Kh");
  await expect(page.locator("#hero-1")).toHaveValue("Qd");
  await expect(page.locator("#board-0")).toHaveValue("Ah");
  await expect(page.locator("#board-3")).toHaveValue("2h");
  await expect(page.locator("#board-4")).toHaveValue("");
  await expect(page.locator("#streetSummary")).toHaveText("Turn");
  await expect(page.locator("#setupStatus")).toHaveText("Turn計算可能");
  await expect(page.locator("#rangeFeedback")).toHaveText("BTN vs BB SRP Turn を適用");
  await expect(page.locator("#setupOopRangeSummary")).toContainText("Standard 30%");
  await expect(page.locator("#setupIpRangeSummary")).toContainText("Standard 30%");
  await expect(page.locator("#turnPanel")).toHaveClass(/is-active/);

  await page.getByRole("button", { name: "Solve Spot" }).click();
  await expect(page.locator("#turnStatus")).toContainText("runouts", { timeout: 10000 });
  expect(pageErrors).toEqual([]);
});

test("applies a preflop setup preset without implying a solved spot", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await page.goto("/?testMode=1");

  await page.locator("#preflopSpot").selectOption("co-btn-3bet-preflop");

  await expect(page.locator("#position")).toHaveValue("CO");
  await expect(page.locator("#villainRange")).toHaveValue("tight");
  await expect(page.locator("#oopPreset")).toHaveValue("standard");
  await expect(page.locator("#ipPreset")).toHaveValue("tight");
  await expect(page.locator("#pot")).toHaveValue("20");
  await expect(page.locator("#toCall")).toHaveValue("7.5");
  await expect(page.locator("#stack")).toHaveValue("92.5");
  await expect(page.locator("#betSize")).toHaveValue("15");
  await expect(page.locator("#hero-0")).toHaveValue("");
  await expect(page.locator("#board-0")).toHaveValue("");
  await expect(page.locator("#streetSummary")).toHaveText("No board");
  await expect(page.locator("#rangeFeedback")).toHaveText("CO vs BTN 3bet Pot を適用");
  await expect(page.locator("#setupOopRangeSummary")).toContainText("Standard 30%");
  await expect(page.locator("#setupIpRangeSummary")).toContainText("Tight 18%");
  await expect(page.locator("#setupRangeStatus")).toHaveText("CO vs BTN 3bet Pot を適用。Solveで再計算します。");
  await expect(page.locator("#preflopSpotStatus")).toContainText("setup preset");
  await expect(page.locator('#preflopSpotCards .spot-card[data-preflop-spot="co-btn-3bet-preflop"]')).toHaveClass(/active/);
  await expect(page.locator("#spotPreset")).toHaveValue("");

  expect(pageErrors).toEqual([]);
});

test("applies spot browser cards and highlights the active preset", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await page.goto("/?testMode=1");

  const turnCard = page.locator('#spotCards .spot-card[data-preset="btn-bb-srp-turn"]');
  const wetFlopCard = page.locator('#spotCards .spot-card[data-preset="btn-bb-wet-flop"]');
  const monotoneCard = page.locator('#spotCards .spot-card[data-preset="btn-bb-srp-flop-monotone"]');

  await expect(turnCard).toContainText("Turn");
  await expect(turnCard).toContainText("BTN vs BB SRP");
  await expect(page.locator("#spotCards .spot-card")).toHaveCount(15);
  await turnCard.click();
  await expect(page.locator("#spotPreset")).toHaveValue("btn-bb-srp-turn");
  await expect(turnCard).toHaveClass(/active/);
  await expect(page.locator("#streetSummary")).toHaveText("Turn");
  await expect(page.locator("#turnPanel")).toHaveClass(/is-active/);

  await wetFlopCard.click();
  await expect(page.locator("#spotPreset")).toHaveValue("btn-bb-wet-flop");
  await expect(wetFlopCard).toHaveClass(/active/);
  await expect(turnCard).not.toHaveClass(/active/);
  await expect(page.locator("#streetSummary")).toHaveText("Flop");
  await expect(page.locator("#flopPanel")).toHaveClass(/is-active/);

  await expect(monotoneCard).toContainText("Monotone");
  await monotoneCard.click();
  await expect(page.locator("#spotPreset")).toHaveValue("btn-bb-srp-flop-monotone");
  await expect(monotoneCard).toHaveClass(/active/);
  await expect(page.locator("#board-0")).toHaveValue("Kh");
  await expect(page.locator("#streetSummary")).toHaveText("Flop");

  expect(pageErrors).toEqual([]);
});

test("filters spot browser cards by street and texture", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await page.goto("/?testMode=1");

  await expect(page.locator("#spotCards .spot-card")).toHaveCount(15);
  await expect(page.locator("#spotBrowserCount")).toHaveText("15 spots");

  await page.locator("#spotStreetFilter").selectOption("Flop");
  await expect(page.locator("#spotCards .spot-card")).toHaveCount(6);
  await expect(page.locator("#spotBrowserCount")).toHaveText("6 Flop spots");
  await expect(page.locator('#spotCards .spot-card[data-preset="btn-bb-srp-turn"]')).toHaveCount(0);

  await page.locator("#spotTextureFilter").selectOption("monotone");
  await expect(page.locator("#spotCards .spot-card")).toHaveCount(1);
  await expect(page.locator('#spotCards .spot-card[data-preset="btn-bb-srp-flop-monotone"]')).toBeVisible();

  await page.locator("#spotStreetFilter").selectOption("River");
  await expect(page.locator("#spotCards .spot-card")).toHaveCount(0);
  await expect(page.locator("#spotBrowserCount")).toHaveText("0 spots");

  await page.locator("#spotTextureFilter").selectOption("all");
  await expect(page.locator("#spotCards .spot-card")).toHaveCount(5);
  await expect(page.locator("#spotBrowserCount")).toHaveText("5 River spots");

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
  await expect(page.getByLabel("Turn solver scope")).toContainText("River rollout average / Lite");
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
  await expect(page.locator("#turnWorstRiver")).not.toHaveText("--");
  await expect(page.locator("#turnVolatility")).not.toHaveText("--");
  await expect(page.locator("#turnRangeCap")).toHaveText("16 combos");
  await expect(page.locator("#turnSolverSettings")).toHaveText("6 iter / 4 runouts / 16 combos");
  await expect(page.locator("#turnCalcTime")).toContainText("ms");
  await expect(page.locator("#turnAccuracy")).toHaveText("Lite: 4/4 runouts, 16 combo cap");
  await expect(page.locator("#turnRunoutRows tr")).toHaveCount(4);
  await expect(page.locator("#turnRunoutRows tr").first().locator("td")).toHaveCount(10);
  await expect(page.locator("#turnRunoutRows tr").first()).toContainText(/blank|overcard|pair|flush-completing|straight-connected/);
  await expect(page.locator("#turnRunoutRows")).toContainText("+");
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
  await expect(page.getByLabel("Flop solver scope")).toContainText("Texture + range heuristic / Lite");
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

test("applies a practice spot and shows a recommendation", async ({ page }) => {
  const pageErrors = collectPageErrors(page);

  await page.goto("/?testMode=1");

  await expect(page.getByLabel("Practice Spot Builder")).toBeVisible();
  await page.locator("#practicePosition").selectOption("BTN");
  await page.locator("#practiceHand").selectOption("JJ");
  await page.locator("#practiceBoard").fill("9s 7d 2c");
  await page.locator("#practicePot").fill("12");
  await page.locator("#practiceFacingAmount").fill("8");
  await page.locator("#practiceStack").fill("85");
  await page.getByRole("button", { name: "Apply practice spot" }).click();

  await expect(page.locator("#position")).toHaveValue("BTN");
  await expect(page.locator("#hero-0")).toHaveValue("Js");
  await expect(page.locator("#hero-1")).toHaveValue("Jh");
  await expect(page.locator("#board-0")).toHaveValue("9s");
  await expect(page.locator("#board-1")).toHaveValue("7d");
  await expect(page.locator("#board-2")).toHaveValue("2c");
  await expect(page.locator("#board-3")).toHaveValue("");
  await expect(page.locator("#pot")).toHaveValue("12");
  await expect(page.locator("#toCall")).toHaveValue("8");
  await expect(page.locator("#betSize")).toHaveValue("8");
  await expect(page.locator("#stack")).toHaveValue("85");
  await expect(page.locator("#streetSummary")).toHaveText("Flop");
  await expect(page.locator("#flopPanel")).toHaveClass(/is-active/);
  await expect(page.locator("#practiceApplyStatus")).toContainText("BTN / JJ / 9s 7d 2c");

  await page.getByRole("button", { name: "Solve Spot" }).click();
  await expect(page.locator("#practiceDecision")).toContainText(/Raise|Call|Fold/, { timeout: 10000 });
  await expect(page.locator("#practiceEquity")).not.toHaveText("--");
  await expect(page.locator("#practicePotOdds")).toHaveText("40%");
  await expect(page.locator("#practiceSpr")).toHaveText("7.1");
  await expect(page.locator("#practiceSource")).toHaveText("Approx EV + Flop Solver Lite");
  await expect(page.locator("#practiceNote")).toContainText("完全GTOではなく学習用の近似");
  await expect(page.locator("#flopStatus")).toContainText("4 turn samples");
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
