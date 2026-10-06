import { test, expect, type Page } from '@playwright/test';

async function oeffne(page: Page, design: '0' | '1') {
  await page.addInitScript((wert) => {
    localStorage.setItem('krs_design_v2', wert);
    localStorage.setItem('krs_design_offer_seen', '1');
    localStorage.setItem('krs_hub_mitteilungen_seen', '["demo"]');
  }, design);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html?forceMode=demo#/connect');
  await expect(page.locator('.shell.connect-aktiv')).toBeVisible();
  await expect(page.locator('iframe.module-frame[data-module="connect"]')).toBeAttached();
  await expect.poll(() => page.frame({ url: /krs-connect/ })?.url() || '').toContain('krs-connect');
}

async function meldung(page: Page, data: Record<string, unknown>) {
  const frame = page.frame({ url: /krs-connect/ });
  expect(frame).toBeTruthy();
  const origin = new URL(page.url()).origin;
  await frame!.evaluate(({ payload, ziel }) => {
    window.parent.postMessage(payload, ziel);
  }, { payload: data, ziel: origin });
}

const gueltig = { type: 'KRS_EDITOR_ACTIVE', version: 1, requestId: 'abc12345', active: true };

test('Neues Design: Leiste nur mit Editor und Tastatur, Hülle bleibt anfassbar', async ({ page }) => {
  await oeffne(page, '1');
  await meldung(page, gueltig);
  await page.waitForTimeout(180);
  await expect(page.locator('html')).not.toHaveClass(/krs-keyboard-open/);
  await expect(page.locator('.design-nav')).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('krs-keyboard-will-show', { detail: { keyboardHeight: 300 } }));
  });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('krs-keyboard-open'))).toBe(true);
  await expect(page.locator('.design-nav')).toBeHidden();
  await expect(page.locator('.design-nav')).toHaveAttribute('aria-hidden', 'true');
  const falle = await page.evaluate(() => ({
    shellInert: document.querySelector('.shell')!.hasAttribute('inert'),
    shellVersteckt: document.querySelector('.shell')!.getAttribute('aria-hidden'),
    rahmen: Array.from(document.querySelectorAll('[inert], [aria-hidden="true"]')).some((el) => !!el.querySelector('iframe')),
  }));
  expect(falle.shellInert).toBe(false);
  expect(falle.shellVersteckt).toBeNull();
  expect(falle.rahmen).toBe(false);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('krs-keyboard-did-hide')));
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('krs-keyboard-open'))).toBe(false);
  await expect(page.locator('.design-nav')).toBeVisible();
  await expect(page.locator('.design-nav')).not.toHaveAttribute('aria-hidden', 'true');
});

test('Fremdes Feld und fremde Quelle verwerfen die Meldung', async ({ page }) => {
  await oeffne(page, '1');
  await meldung(page, { ...gueltig, notiz: 'nein' });
  await page.evaluate(() => {
    window.postMessage({ type: 'KRS_EDITOR_ACTIVE', version: 1, requestId: 'abc12345', active: true }, location.origin);
    window.dispatchEvent(new CustomEvent('krs-keyboard-will-show', { detail: { keyboardHeight: 300 } }));
  });
  await page.waitForTimeout(180);
  await expect(page.locator('html')).not.toHaveClass(/krs-keyboard-open/);
  await expect(page.locator('.design-nav')).toBeVisible();
});

test('Modulwechsel holt die Leiste sofort zurück', async ({ page }) => {
  await oeffne(page, '1');
  await meldung(page, gueltig);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('krs-keyboard-will-show', { detail: { keyboardHeight: 300 } }));
  });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('krs-keyboard-open'))).toBe(true);
  await page.locator('.design-nav button[aria-label="Start"]').evaluate((knopf: HTMLButtonElement) => knopf.click());
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('krs-keyboard-open'))).toBe(false);
  await meldung(page, gueltig);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('krs-keyboard-will-show', { detail: { keyboardHeight: 300 } }));
  });
  await page.waitForTimeout(180);
  await expect(page.locator('html')).not.toHaveClass(/krs-keyboard-open/);
});

test('Vertrautes Design: die Mobil-Leiste folgt derselben Klasse', async ({ page }) => {
  await oeffne(page, '0');
  await expect(page.locator('.mobile-tabs')).toBeVisible();
  await meldung(page, gueltig);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('krs-keyboard-will-show', { detail: { keyboardHeight: 300 } }));
  });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('krs-keyboard-open'))).toBe(true);
  await expect(page.locator('.mobile-tabs')).toBeHidden();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('krs-keyboard-did-hide')));
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('krs-keyboard-open'))).toBe(false);
  await expect(page.locator('.mobile-tabs')).toBeVisible();
});

test('Geschrumpfter Viewport versteckt die Leiste, Zoom nicht', async ({ page }) => {
  await page.addInitScript(() => {
    let h = 844;
    let scale = 1;
    const listeners: Record<string, Array<() => void>> = {};
    const fake = {
      get height() { return h; },
      get width() { return window.innerWidth; },
      get scale() { return scale; },
      get offsetTop() { return 0; },
      get offsetLeft() { return 0; },
      get pageTop() { return 0; },
      get pageLeft() { return 0; },
      addEventListener(type: string, fn: () => void) { (listeners[type] || (listeners[type] = [])).push(fn); },
      removeEventListener(type: string, fn: () => void) { listeners[type] = (listeners[type] || []).filter((eintrag) => eintrag !== fn); },
    };
    (window as any).__krsFakeViewport = {
      set(next: number, nextScale?: number) {
        h = next;
        if (typeof nextScale === 'number') scale = nextScale;
        (listeners.resize || []).forEach((fn) => fn());
      },
    };
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => fake });
  });
  await oeffne(page, '1');
  await page.evaluate(() => (window as any).__krsFakeViewport.set(640));
  await page.waitForTimeout(180);
  await expect(page.locator('html')).not.toHaveClass(/krs-keyboard-open/);
  await meldung(page, gueltig);
  await page.evaluate(() => (window as any).__krsFakeViewport.set(640));
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('krs-keyboard-open'))).toBe(true);
  await page.evaluate(() => (window as any).__krsFakeViewport.set(640, 1.5));
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('krs-keyboard-open'))).toBe(false);
  const huelle = await page.evaluate(() => document.querySelector('.shell')!.hasAttribute('inert'));
  expect(huelle).toBe(false);
});
