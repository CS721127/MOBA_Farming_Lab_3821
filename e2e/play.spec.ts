import { test, expect } from "@playwright/test";
test("exact lane step/revisit, pause and budget reset", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Single lane", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Path two-pointer", exact:true,
    })
    .click();
  await expect(page.locator(".route-outcome")).toContainText("21");
  const step = page.getByRole("button", { name: "Step one edge", exact: true });
  await step.click();
  await expect(page.getByTestId("score")).toHaveText("8 / 33");
  await expect(page.getByTestId("cost")).toHaveText("2 / 10");
  await step.click();
  await expect(page.getByTestId("score")).toHaveText("8 / 33");
  await expect(page.getByTestId("cost")).toHaveText("4 / 10");
  for (let i = 0; i < 3; i++) await step.click();
  await expect(page.getByTestId("score")).toHaveText("21 / 33");
  await page
    .getByRole("button", { name: "Replay from start", exact: true })
    .click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const score = await page.getByTestId("score").textContent();
  await page.waitForTimeout(800);
  await expect(page.getByTestId("score")).toHaveText(score!);
  await page.getByLabel("Travel budget numeric", { exact: true }).fill("0");
  await expect(page.getByTestId("score")).toHaveText("1 / 33");
  await expect(page.getByTestId("cost")).toHaveText("0 / 0");
});
test("manual adjacency and identical scenario comparison", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Scenario", { exact: true }).selectOption("branch");
  await page
    .getByRole("button", { name: "Manual exploration", exact:true })
    .click();
  await page
    .getByText("Resource details & keyboard movement", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Crystal heart +5", exact: true })
    .click();
  await expect(page.getByTestId("score")).toHaveText("0 / 15");
  await page.getByRole("button", { name: "Moon camp +4", exact: true }).click();
  await page
    .getByRole("button", { name: "Step one edge", exact: true })
    .click();
  await expect(page.getByTestId("score")).toHaveText("4 / 15");
  await page
    .getByRole("checkbox", { name: "Compare on the same map ⇄" })
    .check();
  await expect(page.locator("canvas")).toHaveCount(2);
  await expect(
    page.getByRole("button", {
      name: "Path two-pointer", exact:true,
    }),
  ).toBeDisabled();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.evaluate(() => document.documentElement.clientWidth),
  );
});
test("greedy trap contains real exact benchmark", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Scenario", { exact: true }).selectOption("trap");
  await expect(
    page.getByRole("row").filter({ hasText: "Greedy · nearest" }),
  ).toContainText("20%");
  await expect(
    page.getByRole("row").filter({ hasText: "Held–Karp DP" }),
  ).toContainText("100%");
});

test("generated graph uses the default canvas without inspector or zoom controls", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Generated node count", { exact: true }).fill("100");
  await page.getByLabel("Generated travel budget", { exact: true }).fill("37");
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.locator(".map-wrap > canvas.world")).toBeVisible();
  await expect(page.getByLabel("Travel budget numeric", { exact: true })).toHaveValue("37");
  await expect(page.getByTestId("cost")).toHaveText("0 / 37");
  await expect(page.locator(".graph-view-tools, .graph-inspector, .illustrated-scroll")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Fit map", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Clear highlight", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Inspect node", { exact: true })).toHaveCount(0);
});

test("generated graph comparison reuses default-sized canvas, including replay", async ({ page }) => {
  await page.goto("/");
  const original = await page.locator(".map-wrap > canvas.world").boundingBox();
  expect(original).not.toBeNull();

  // Use a solvable generated graph so both route replays can be compared.
  await page.getByLabel("Generated node count", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  const canvas = page.locator(".map-wrap > canvas.world");
  const sameSize = async () => {
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeCloseTo(original!.width, 0);
    expect(box!.height).toBeCloseTo(original!.height, 0);
    expect(box!.width / box!.height).toBeCloseTo(900 / 620, 2);
  };
  await sameSize();

  await page.getByRole("checkbox", { name: "Compare on the same map ⇄" }).check();
  await expect(page.locator(".map-wrap > canvas.world")).toHaveCount(1);
  await expect(page.locator(".graph-view-tools, .graph-inspector")).toHaveCount(0);
  await expect(page.locator(".mini-map > canvas.world")).toBeVisible();
  await sameSize();

  await page.getByRole("button", { name: "Run", exact: true }).click();
  await sameSize();
  await page.getByRole("button", { name: "Replay from start", exact: true }).click();
  await sameSize();
});
