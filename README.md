# Swap Lab

A small, browser-only experiment for token holders on the BluePrint Ground sheet. Enter an ETH amount, choose a pool depth, and compare tokens received and price impact. The visible footer explains what was built and why.

The deliverable is **`dist/index.html` and everything beside it in `dist/`**. The React + TypeScript source and exact npm lockfile live in `web/`. There is no wallet connection, transaction flow, account, storage, analytics, API, remote font, or external runtime asset. Calculations update locally; refreshing resets the example.

## Install and rebuild

Use Node.js 22.12+ and npm 10+ (validated with Node 22.23.3 and npm 10.9.9).

```sh
cd web
npm ci
npm run typecheck
npm run build
npm run preview
```

Vite prints the preview URL. Build output goes to repository-root `dist/`, with `base: './'`. Install needs registry access or an already populated npm cache; production compilation makes no external requests. Do not add generated `node_modules`, caches, or dependency archives to the submission.

For a clean contributor workspace, this equivalent root command stages dependencies exclusively in the disposable `test/scratch/` directory, runs typecheck and production build, and copies the export into `dist/`:

```sh
node scripts/build.mjs
# After its npm cache is populated, also supported and validated:
node scripts/build.mjs --offline
```

The checked-in CSP intentionally disallows connections and inline scripts. Use the production preview to inspect the module; the development server's hot-reload WebSocket is outside this CSP. No configuration secrets or environment files are needed.

## Preview and publish

To preview the already built export without npm dependencies:

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080/`. Serve over HTTP(S), not `file://`, because browser module scripts require it. Publish the **contents** of `dist/` to a static directory, preserving `assets/`, `favicon.svg`, and `licenses.txt`. No server rewrite, build service, backend, or root-relative asset path is required. The checked export was tested at `/preview/`.

Example embedding from a host page (replace `./module/` with the published directory):

```html
<iframe
  title="Swap Lab — explore swap size and pool depth"
  src="./module/"
  width="100%"
  height="850"
  style="border: 0"
  sandbox="allow-scripts allow-same-origin"
></iframe>
```

The iframe scrolls normally, including on phones. Its host controls the height; the module does not message its parent or attempt automatic resizing. Script execution must be permitted. With a sandbox, same-origin permission is needed for normal static module loading; an opaque-origin sandbox without it was not a supported publishing target. The publisher must allow framing through its own HTTP headers. Test the final host's CSP and iframe policy before publishing.

## What the model means

Three fictional pools start at 10,000 generic TOKEN per ETH, with reserves of 10/100/1,000 ETH and 100,000/1,000,000/10,000,000 TOKEN respectively. They are examples, not real pools or BLUEPRINT token reserves. ETH represents the wrapped ETH side of the example pair. Each edit starts again from the initial reserves.

For an input `a`, ETH reserve `x`, token reserve `y`, and fixed fee `f = 0.003`:

```text
effective input = a × (1 − f)
tokens out = y × effective input / (x + effective input)
price impact = effective input / (x + effective input) × 100%
pool fee = a × f
```

Price impact compares output with the initial reserve ratio after the same fee is deducted in both cases. It excludes the fee itself, which is shown separately. This constant-product model follows the mechanics described in the [Uniswap v2 pricing documentation](https://developers.uniswap.org/docs/protocols/v2/concepts/pricing); the interface and assets are original and do not impersonate an exchange.

The amount range is 0.000001–10,000 ETH. Values use a decimal point and no commas or scientific notation. Results are approximate JavaScript numbers, with display rounding rather than contract integer rounding. This is an educational simulation, not a live quote. Gas, token taxes, other trades, routing, concentrated liquidity, execution and slippage tolerance are outside the model. No actual trade can be made here.

## Checks actually run

Final checks on 2026-10-09:

| Command / check | Actual result |
| --- | --- |
| `node scripts/build.mjs --offline` | Passed: lockfile install from the populated local cache, `tsc --noEmit`, and Vite production build |
| `node --experimental-strip-types --test scripts/math.test.mjs` | 7 tests passed; includes independent rational examples and 1,000 bounded inputs across all three pools |
| `node scripts/browser-check.mjs` | Passed: 17 check groups against the actual static export, including iframe operation, offline interaction, keyboard flow, validation and comparison |
| Responsive checks | No page overflow at 320, 360, 400, 600, 768, 800 and 1200 CSS pixels; inspected final desktop/mobile screenshots |
| axe-core 4.11.0 | Zero reported violations at 360 and 1200 pixels, 43 passing rules per state; contrast items needing manual review are retained in the report |
| Rendered contrast | Nine text/background pairs measured at 4.80:1–13.21:1 |
| Runtime resources | All observed requests were to the local static host; no failed resources or console errors |
| Packaging | See `artifacts/delivery.json` for measured bytes and export hashes; no dependencies or caches included |

The browser MCP connector returned `Transport closed`. Validation instead used the installed Playwright and Chromium headless shell, with a temporary HTTP server inside one bounded foreground script. Both close before it exits. The final screenshots and machine-readable results are in `artifacts/`; the six-domain review, fixes, and limitations are in [artifacts/validation.md](artifacts/validation.md).

To reproduce browser checks on this worker image:

```sh
npm install --prefix test/scratch/a11y --cache test/scratch/npm-cache --no-audit --no-fund --save-exact axe-core@4.11.0
node scripts/browser-check.mjs
```

On another machine, provide absolute `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE`, and `AXE_PATH` paths to an installed Playwright module, Chromium executable, and `axe.min.js`. These variables belong only to the check script; they are not app settings or bundled into the site. Browser tools are not necessary to build or publish the site.

Not verified: physical devices, Safari/Firefox, screen-reader speech, native browser zoom, or the eventual publisher's framing headers. The 200% check enlarges root text, not native zoom. The supplied descriptions distinguish this from modules 1–3; modules 4, 6 and 7 could not be inspected because the supplied URLs returned access errors/HTTP 403. No claim of comparison with their hidden contents is made.

## Files and attribution

- `web/`: complete source, package manifest, lockfile and build configuration.
- `dist/`: finished relative static export, including runtime license notices.
- `scripts/`: repeatable build, math, browser and packaging checks.
- `DESIGN.md`: implemented design system and responsive behavior.
- `artifacts/`: actual review, results and screenshots.
- `docs/`: guidance attribution and license records.

No ignore file was changed. Generated dependencies and caches stayed in `test/scratch/`, which the assignment excludes from submission. No Git metadata was modified; the contributor worker collects the delivered source and export. See [docs/NOTICE.md](docs/NOTICE.md) for pinned Better Interface/Impeccable attribution and the accompanying full licenses.
