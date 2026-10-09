// Foreground-only production check: preview and browser close before this process exits.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || '/opt/imd-tools/playwright-mcp/node_modules/playwright/index.mjs'));
const executablePath = process.env.CHROMIUM_EXECUTABLE || '/opt/imd-tools/ms-playwright/chromium_headless_shell-1246/chrome-headless-shell-linux64/chrome-headless-shell';
const axeSource = readFileSync(process.env.AXE_PATH || resolve(root, 'test/scratch/a11y/node_modules/axe-core/axe.min.js'), 'utf8');
const artifact = name => resolve(root, 'artifacts', name);
mkdirSync(resolve(root, 'artifacts'), { recursive: true });
const report = { checks: [], viewports: [], contrast: [], requests: [], errors: [], a11y: [] };
const check = (name, detail) => { report.checks.push({ name, result: 'pass', detail }); console.log(`PASS ${name}`); };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/frame.html') {
    res.setHeader('Content-Type', 'text/html');
    return res.end('<!doctype html><html lang="en"><title>Iframe validation</title><style>body{margin:0}iframe{display:block;border:0;width:100%;height:800px}</style><iframe title="Swap Lab" sandbox="allow-scripts allow-same-origin" src="/preview/"></iframe></html>');
  }
  const base = resolve(root, 'dist');
  const path = resolve(base, decodeURIComponent(url.pathname.replace(/^\/preview\//, '')));
  if (!url.pathname.startsWith('/preview/') || !(path === base || path.startsWith(base + '/'))) {
    res.writeHead(404); return res.end();
  }
  try {
    const target = url.pathname.endsWith('/') ? path + '/index.html' : path;
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(target)] || 'application/octet-stream');
    res.end(readFileSync(target));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('requestfailed', request => report.errors.push(`${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await context.route('**/*', route => {
    report.requests.push(route.request().url());
    return route.request().url().startsWith(origin + '/') ? route.continue() : route.abort();
  });
  await page.goto(origin + '/preview/');
  await page.getByRole('heading', { name: /A little clarity/ }).waitFor();
  assert.equal(await page.getByTestId('output').textContent(), '9,871.58');
  assert.equal(await page.getByTestId('impact').textContent(), '0.99%');
  check('default output and impact');

  await page.getByRole('button', { name: '5 ETH', exact: true }).click();
  assert.equal(await page.locator('#amount').inputValue(), '5');
  assert.equal(await page.getByTestId('output').textContent(), '47,482.97');
  await page.getByRole('radio', { name: /Shallow/ }).check();
  assert.equal(await page.getByTestId('impact').textContent(), '33.27%');
  assert.ok(await page.locator('.strong-impact').isVisible());
  check('amount shortcut and shallow-pool result');

  await page.getByRole('button', { name: 'Compare all three pools' }).click();
  assert.equal(await page.locator('.comparison-grid article').count(), 3);
  assert.equal(await page.locator('.comparison-grid article').nth(2).locator('strong').textContent(), '49,602.73 TOKEN');
  await page.screenshot({ path: artifact('comparison.png'), fullPage: true });
  await page.getByRole('button', { name: 'Hide comparison' }).click();
  assert.ok(await page.locator('#comparison').isHidden());
  check('comparison opens, calculates all depths, and closes');

  for (const value of ['', '0', '-1', '1,000', 'NaN', '1e3', '10001', '0.0000001']) {
    await page.locator('#amount').fill(value);
    assert.equal(await page.locator('#amount').getAttribute('aria-invalid'), 'true');
    assert.ok(await page.locator('#amount-error').isVisible());
    assert.equal(await page.getByTestId('output').count(), 0);
  }
  await page.locator('#amount').fill('0.000001');
  assert.equal(await page.locator('#amount').getAttribute('aria-invalid'), 'false');
  assert.equal(await page.getByTestId('impact').textContent(), '<0.01%');
  await page.locator('#amount').fill('10000');
  assert.ok(await page.getByTestId('output').isVisible());
  assert.ok(!(await page.locator('body').innerText()).includes('NaN'));
  check('invalid amounts hide stale results; minimum and maximum recover');

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  assert.equal(await page.locator('#amount').inputValue(), '1');
  assert.ok(await page.getByRole('radio', { name: /Medium/ }).isChecked());
  assert.equal(await page.getByTestId('output').textContent(), '9,871.58');
  check('reset restores default state');

  await page.reload();
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').textContent(), 'Skip to simulator');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'simulator');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').textContent(), ' Reset');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'amount');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('2');
  for (let i = 0; i < 5; i++) await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').getAttribute('value'), 'medium');
  await page.keyboard.press('ArrowRight');
  assert.ok(await page.getByRole('radio', { name: /Deep/ }).isChecked());
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  assert.ok(await page.locator('#comparison').isVisible());
  await page.screenshot({ path: artifact('keyboard-focus.png'), fullPage: true });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  assert.ok(await page.locator('details').getAttribute('open') !== null);
  check('keyboard-only skip link, entry, radio arrows, comparison and disclosure');

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.locator('summary').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const width of [1200, 800, 768, 600, 400, 360, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, body: document.body.scrollWidth, label: getComputedStyle(document.querySelector('.x-labels')).fontSize }));
    assert.ok(metrics.scroll <= width && metrics.body <= width, JSON.stringify(metrics));
    report.viewports.push(metrics);
    if ([1200, 360, 320].includes(width)) await page.screenshot({ path: artifact(width === 1200 ? 'desktop.png' : width === 360 ? 'mobile.png' : 'reflow-320.png'), fullPage: true });
  }
  check('no page overflow at seven widths, including 360 and 1200');

  for (const width of [1200, 360]) {
    await page.setViewportSize({ width, height: 900 });
    // Evaluate the local audit source, without modifying the production CSP or loading a URL.
    await page.evaluate(axeSource);
    const audit = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
    report.a11y.push({ width, violations: audit.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), incomplete: audit.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), passes: audit.passes.length });
  }
  check('automated accessibility audit completed at desktop and mobile', report.a11y);

  report.contrast = await page.evaluate(() => {
    function rgb(s) { return s.match(/[\d.]+/g).slice(0, 3).map(Number); }
    function luminance(c) { return rgb(c).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0); }
    function background(el) { for (let p = el; p; p = p.parentElement) { const c = getComputedStyle(p).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; } return 'rgb(255, 255, 255)'; }
    return ['h1', '.intro-aside p', '.result-label', '.field-hint', '.pool-option.selected .pool-size', '.compare-button', '.insight', '.x-labels', '.site-footer p'].map(selector => {
      const el = document.querySelector(selector), foreground = getComputedStyle(el).color, bg = background(el);
      const a = luminance(foreground), b = luminance(bg);
      return { selector, foreground, background: bg, ratio: Number(((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2)) };
    });
  });
  assert.ok(report.contrast.every(pair => pair.ratio >= 4.5), JSON.stringify(report.contrast));
  check('nine rendered text/background pairs meet 4.5:1');

  await page.setViewportSize({ width: 360, height: 800 });
  await page.locator('#amount').fill('10000');
  await page.getByRole('button', { name: 'Compare all three pools' }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('summary').click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: artifact('mobile-expanded.png'), fullPage: true });
  check('mobile maximum amount, comparison and long formulas reflow');

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const poolLabels = await page.locator('.pool-option').evaluateAll(els => els.map(el => {
    const card = el.getBoundingClientRect(), label = el.querySelector('.pool-name').getBoundingClientRect();
    return { cardRight: card.right, labelRight: label.right };
  }));
  assert.ok(poolLabels.every(item => item.labelRight < item.cardRight));
  await page.screenshot({ path: artifact('text-enlargement.png'), fullPage: true });
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  check('200% root text enlargement reflows at 360px (not native browser zoom)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const duration = await page.locator('.compare-button').evaluate(el => getComputedStyle(el).transitionDuration);
  assert.equal(duration, '0s');
  check('reduced motion removes button transitions');

  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('#amount').focus();
  await page.screenshot({ path: artifact('forced-colors.png'), fullPage: true });
  await page.emulateMedia({ forcedColors: 'none' });
  check('forced colors screenshot captured for manual inspection');

  await context.setOffline(true);
  await page.getByRole('button', { name: '10 ETH', exact: true }).click();
  assert.equal(await page.getByTestId('output').textContent(), '90,661.09');
  check('primary interaction works with network offline after loading');
  await context.setOffline(false);
  await page.goto(origin + '/frame.html');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: '5 ETH', exact: true }).click();
  assert.equal(await frame.getByTestId('output').textContent(), '47,482.97');
  await frame.getByRole('radio', { name: /Deep/ }).check();
  assert.equal(await frame.getByTestId('output').textContent(), '49,602.73');
  check('module works in an iframe with scripts and same-origin permissions');

  assert.ok(report.requests.every(url => url.startsWith(origin + '/')));
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
  check('no external runtime requests, failed resources or console errors');
  assert.ok(report.a11y.every(a => a.violations.length === 0), JSON.stringify(report.a11y));
  check('zero automated accessibility violations in both checked states');
} finally {
  writeFileSync(artifact('browser-results.json'), JSON.stringify(report, null, 2) + '\n');
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
}
