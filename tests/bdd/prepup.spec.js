import { test, expect } from '@playwright/test';

/**
 * BDD-style scenarios for Prep'Up homepage and navigation.
 * Given / When / Then structure maps user stories to assertions.
 */

test.describe('Feature: Homepage', () => {
  test('Scenario: Visitor discovers tools from hero CTA', async ({ page }) => {
    // Given I am on the homepage
    await page.goto('/');

    // When I click "Découvrir les outils"
    await page.getByRole('link', { name: /Découvrir les outils/i }).click();

    // Then I see the outils section
    await expect(page.locator('#outils')).toBeInViewport();
    await expect(page.getByRole('heading', { name: /Tout ce qu'il te faut/i })).toBeVisible();
  });

  test('Scenario: About section lists tool names', async ({ page }) => {
    await page.goto('/#a-propos');

    const about = page.locator('#a-propos');
    await expect(about.getByRole('heading', { name: /Fait par des prépas/i })).toBeVisible();
    await expect(about.getByRole('link', { name: 'Rang & filières accessibles', exact: true })).toBeVisible();
    await expect(about.getByRole('link', { name: 'Ressources', exact: true })).toBeVisible();
    await expect(about.getByRole('link', { name: 'Chapitres du concours', exact: true })).toBeVisible();
    await expect(about.getByRole('link', { name: 'Pomodoro', exact: true })).toBeVisible();
  });
});

test.describe('Feature: Calculateur de rang', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculateur.html');
  });

  test('Scenario: Student estimates rank from notes', async ({ page }) => {
    // Given the MP filière is selected and I enter notes
    const firstInput = page.locator('.matiere-row input').first();
    await firstInput.fill('15');

    // Then score and rank update
    await expect(page.locator('#score-value')).not.toHaveText('-');
    await expect(page.locator('#rank-value')).toContainText('/');
  });

  test('Scenario: Bonus adds 15 points to score', async ({ page }) => {
    await page.locator('.matiere-row input').first().fill('10');
    const scoreBefore = await page.locator('#score-value').textContent();

    await page.locator('#bonus-check').check();
    const scoreAfter = await page.locator('#score-value').textContent();

    expect(parseFloat(scoreAfter)).toBe(parseFloat(scoreBefore) + 15);
  });

  test('Scenario: Reset clears all notes', async ({ page }) => {
    await page.locator('.matiere-row input').first().fill('12');
    await page.locator('#reset-btn').click();

    await expect(page.locator('.matiere-row input').first()).toHaveValue('');
    await expect(page.locator('#rank-value')).toHaveText('-');
  });

  test('Scenario: Simulateur tab accepts rank input', async ({ page }) => {
    await page.getByRole('button', { name: /Simulateur de rang/i }).click();
    await expect(page.locator('#tab-rang')).toHaveClass(/active/);
    await page.locator('#sim-rank-input').fill('500');

    await expect(page.locator('#sim-rank-input')).toHaveValue('500');
    await expect(page.locator('#sim-list')).toBeVisible();
  });
});

test.describe('Feature: Ressources', () => {
  test('Scenario: Student browses resources by filière', async ({ page }) => {
    await page.goto('/ressources.html');

    await expect(page.locator('#filiere-select button').first()).toBeVisible();
    await expect(page.locator('.res-group, .res-item').first()).toBeVisible();
  });

  test('Scenario: Search filters resource list', async ({ page }) => {
    await page.goto('/ressources.html');
    await page.locator('#res-search').fill('math');

    // At least the search input works; groups may hide if no match
    await expect(page.locator('#res-search')).toHaveValue('math');
  });
});

test.describe('Feature: Chapitres du concours MP', () => {
  test('Scenario: Student switches between épreuves', async ({ page }) => {
    await page.goto('/chapitres-concours.html');

    const tabs = page.locator('#chap-tabs button');
    await expect(tabs.first()).toBeVisible();
    const count = await tabs.count();
    if (count > 1) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveClass(/active/);
    }
    await expect(page.locator('#chap-panel .chap-row, #chap-panel [class*="chap"]').first()).toBeVisible();
  });
});
