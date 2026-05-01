import { test, expect } from "../playwright-fixture";
import { PRESET_TEMPLATES } from "../src/lib/preset-templates";

/**
 * Smoke test · the Settings Presets tab renders one card per template.
 * Skipped when the preview shell is not signed in (auth screen).
 */
test("presets tab renders a card for every template", async ({ page }) => {
  await page.goto("/app/settings");

  // If auth gate redirects us, skip — auth flows are tested separately.
  await page.waitForLoadState("networkidle");
  if (!page.url().includes("/app/settings")) {
    test.skip(true, "Not authenticated in this preview run");
    return;
  }

  const presetsTab = page.getByRole("tab", { name: /presets/i });
  if (!(await presetsTab.isVisible().catch(() => false))) {
    test.skip(true, "Settings tabs not visible (no admin session)");
    return;
  }
  await presetsTab.click();

  for (const p of PRESET_TEMPLATES) {
    await expect(
      page.getByTestId(`preset-card-${p.id}`),
      `card missing for ${p.id}`,
    ).toBeVisible();
    await expect(
      page.getByTestId(`preset-apply-${p.id}`),
    ).toBeVisible();
  }
});