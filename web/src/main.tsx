import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FEE, POOLS, number, parseAmount, percent, simulate, type Pool } from './math';
import './styles.css';

function Icon({ name, className = '' }: { name: 'swap' | 'arrow' | 'reset' | 'check' | 'expand'; className?: string }) {
  const paths = {
    swap: 'M4 7h16m-5-5 5 5-5 5M20 17H4m5 5-5-5 5-5',
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    reset: 'M4 10a8 8 0 1 1 1 7M4 4v6h6',
    check: 'm5 12 4 4L19 6',
    expand: 'm6 9 6 6 6-6',
  };
  return <svg className={className} aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

function PoolGlyph({ depth }: { depth: number }) {
  return <span className="pool-glyph" aria-hidden="true">{[1, 2, 3].map(n => <i key={n} className={n <= depth ? 'filled' : ''} />)}</span>;
}

function ImpactChart({ amount, pool }: { amount: number; pool: Pool }) {
  const maxX = Math.max(10, Math.ceil(amount / 10) * 10);
  const maxY = Math.max(1, Math.ceil(simulate(maxX, pool).impact));
  const x = (value: number) => 46 + (value / maxX) * 470;
  const y = (value: number) => 190 - (value / maxY) * 154;
  const points = Array.from({ length: 81 }, (_, i) => {
    const value = (i / 80) ** 2 * maxX;
    return `${x(value)},${y(simulate(value, pool).impact)}`;
  });
  const selectedY = y(simulate(amount, pool).impact);
  return <div className="chart">
    <div className="chart-heading"><h3>As your swap grows</h3><span><i /> Price impact</span></div>
    <div className="chart-plot">
    <div className="y-labels" aria-hidden="true"><span>{number(maxY)}%</span><span>{number(maxY / 2, 1)}%</span><span>0%</span></div>
    <svg viewBox="0 0 548 234" role="img" aria-labelledby="chart-title chart-description">
      <title id="chart-title">Swap size and price impact</title>
      <desc id="chart-description">In the {pool.name.toLowerCase()} pool, swapping {number(amount, 6)} ETH has {percent(simulate(amount, pool).impact)} price impact. Larger swaps have more impact. The horizontal axis spans 0 to {number(maxX)} ETH; the vertical axis spans 0 to {number(maxY)} percent.</desc>
      {[0, 0.5, 1].map(t => <line key={t} className="grid-line" x1="46" x2="516" y1={y(t * maxY)} y2={y(t * maxY)} />)}
      <polygon className="chart-area" points={`46,190 ${points.join(' ')} 516,190`} />
      <polyline className="chart-line" points={points.join(' ')} />
      <line className="marker-line" x1={x(amount)} x2={x(amount)} y1={selectedY} y2="190" />
      <circle className="marker-halo" cx={x(amount)} cy={selectedY} r="8" />
      <circle className="marker" cx={x(amount)} cy={selectedY} r="4" />
    </svg>
    <div className="x-labels" aria-hidden="true">{[0, 0.25, 0.5, 0.75, 1].map(t => <span key={t}>{number(t * maxX, 1)}</span>)}</div>
    </div>
    <div className="chart-caption"><span><i /> Your swap: {number(amount, 6)} ETH</span><span>Swap size (ETH)</span></div>
  </div>;
}

function App() {
  const [rawAmount, setRawAmount] = useState('1');
  const [poolId, setPoolId] = useState<Pool['id']>('medium');
  const [compared, setCompared] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const pool = POOLS.find(p => p.id === poolId)!;
  const amount = parseAmount(rawAmount);
  const result = amount === null ? null : simulate(amount, pool);

  useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncement(result
      ? `${pool.name} pool: approximately ${number(result.output, 4)} tokens received. Price impact ${percent(result.impact)}.`
      : 'Enter a valid ETH amount to see the simulation.'), 450);
    return () => window.clearTimeout(timer);
  }, [rawAmount, poolId]);

  function reset() {
    setRawAmount('1');
    setPoolId('medium');
    setCompared(false);
    setAnnouncement('Example reset to 1 ETH in the medium pool.');
  }

  return <>
    <a className="skip-link" href="#simulator">Skip to simulator</a>
    <header className="site-header">
      <div className="wordmark"><span className="brand-icon"><Icon name="swap" /></span>swap<span className="wordmark-light">lab</span><span className="wordmark-dot">.</span></div>
      <span className="header-caption">The token holder’s workbench</span>
      <a className="header-link" href="#mechanics">The mechanics <Icon name="arrow" /></a>
    </header>
    <main>
      <section className="intro" aria-labelledby="page-title">
        <div><p className="eyebrow"><span /> A pocket-sized experiment</p><h1 id="page-title">A little clarity<br />before the <em>swap.</em></h1></div>
        <div className="intro-aside"><p>Same token. Same starting price.<br />A different pool can change everything.</p><p className="intro-hint">Change the numbers. See the impact. <span aria-hidden="true">↙</span></p></div>
      </section>

      <section id="simulator" className="simulator" aria-label="Swap simulator" tabIndex={-1}>
        <div className="controls-panel">
          <div className="section-top"><h2 className="eyebrow">01 / Set up a swap</h2><button className="reset-button" onClick={reset}><Icon name="reset" /> Reset</button></div>
          <div className="amount-field">
            <label htmlFor="amount">You put in<span className="sr-only"> (ETH)</span></label>
            <div className={`amount-input ${amount === null ? 'invalid' : ''}`}><input id="amount" name="amount" type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={rawAmount} aria-invalid={amount === null} aria-describedby={amount === null ? 'amount-error' : 'amount-help'} onChange={event => setRawAmount(event.target.value)} /><span className="currency"><svg width="14" height="24" viewBox="0 0 14 24" aria-hidden="true"><path d="m7 0 7 12-7 4-7-4Z" fill="currentColor" opacity=".75"/><path d="m0 14 7 4 7-4-7 10Z" fill="currentColor"/></svg> ETH</span></div>
            {amount === null ? <p id="amount-error" className="input-error">Enter a number from 0.000001 to 10,000. Use a decimal point, without commas.</p> : <p id="amount-help" className="field-hint">Try an amount, or pick a shortcut.</p>}
            <div className="amount-shortcuts" role="group" aria-label="Example swap amounts">{['0.1', '1', '5', '10'].map(value => <button key={value} aria-pressed={amount === Number(value)} onClick={() => setRawAmount(value)}>{value}<span> ETH</span></button>)}</div>
          </div>

          <fieldset className="pool-picker"><legend>Choose a pool depth</legend><div className="pool-options">{POOLS.map((p, i) => <label key={p.id} className={`pool-option ${poolId === p.id ? 'selected' : ''}`}><input type="radio" name="pool" value={p.id} checked={poolId === p.id} onChange={() => setPoolId(p.id)} /><PoolGlyph depth={i + 1} /><span className="pool-name">{p.name}</span><span className="pool-size">{p.caption}</span></label>)}</div><p className="field-hint">More depth means more tokens in the pool.</p></fieldset>

          <div className="pool-inventory"><div><span>Example pool reserves</span><span className="small-label">ETH / TOKEN</span></div><p><strong>{number(pool.eth)} ETH</strong><span aria-hidden="true"> + </span><strong>{number(pool.tokens)} TOKEN</strong></p><div className="reserve-bar" aria-hidden="true"><span /><span /></div><div className="inventory-note"><span>1 ETH = 10,000 TOKEN</span><span>0.3% fee</span></div></div>
          <div className="sandbox-note"><span className="sandbox-symbol" aria-hidden="true">◎</span><p>Play with the numbers.<br /><strong>Everything here is a simulation.</strong></p></div>
        </div>

        <div className="results-panel">
          <div className="section-top"><h2 className="eyebrow">02 / See the difference</h2><span className="example-badge">Example data</span></div>
          {result && amount !== null ? <>
            <p className="result-label">You would receive approximately</p>
            <div className="main-result"><span data-testid="output">{number(result.output, result.output < 1 ? 6 : 2)}</span><span className="token-unit">TOKEN</span></div>
            <div className="result-metrics"><div><span>Price impact <span className="metric-symbol" aria-hidden="true">↗</span></span><strong data-testid="impact">{percent(result.impact)}</strong></div><div><span>Pool fee</span><strong>{number(result.fee, 9)} <small>ETH</small></strong></div><div><span>Swap / ETH reserve</span><strong>{percent((amount / pool.eth) * 100)}</strong></div></div>
            <ImpactChart amount={amount} pool={pool} />
            <div className={`insight ${result.impact >= 5 ? 'strong-impact' : ''}`}><span className="insight-icon" aria-hidden="true">{result.impact >= 5 ? '↗' : '↳'}</span><p><strong>{result.impact >= 5 ? 'A bigger bite out of the pool.' : 'Pool depth makes a difference.'}</strong> This swap returns {number(result.fewerTokens, result.fewerTokens < 0.01 ? 12 : 2)} fewer tokens than the starting rate after the same fee.</p></div>
          </> : <div className="empty-result"><Icon name="swap" /><h3>Give your swap a number.</h3><p>Enter an ETH amount or choose a shortcut to see how this pool responds.</p></div>}
          <button className="compare-button" aria-expanded={compared} aria-controls="comparison" onClick={() => setCompared(value => !value)}>{compared ? 'Hide comparison' : 'Compare all three pools'}<Icon name="expand" className={compared ? 'expanded' : ''} /></button>
        </div>
      </section>

      <div id="comparison" hidden={!compared} className="comparison"><div className="comparison-heading"><h2>Same swap. Three different outcomes.</h2><p>{amount !== null ? `${number(amount, 6)} ETH in. The starting rate and 0.3% fee stay the same.` : 'Enter a valid amount to compare the pools.'}</p></div><div className="comparison-grid">{POOLS.map((p, i) => { const simulated = amount !== null ? simulate(amount, p) : null; return <article key={p.id} className={p.id === poolId ? 'current-pool' : ''}><div><PoolGlyph depth={i + 1} /><h3>{p.name}</h3>{p.id === poolId && <span className="current-label">Selected</span>}</div><strong>{simulated ? number(simulated.output, simulated.output < 1 ? 6 : 2) : '—'} <small>TOKEN</small></strong><p>{simulated ? `${percent(simulated.impact)} price impact` : 'Waiting for an amount'}</p></article>; })}</div></div>

      <section id="mechanics" className="mechanics" aria-labelledby="mechanics-title"><div className="mechanics-heading"><h2 id="mechanics-title">A swap, unpacked.</h2><span className="small-label">Three things to take with you</span></div><div className="learning-grid"><article><span className="lesson-number">01</span><h3>Depth changes the deal.</h3><p>A swap takes tokens out of a pool. The larger your swap relative to its reserves, the more the exchange rate moves.</p></article><article><span className="lesson-number">02</span><h3>Impact isn’t slippage.</h3><p>Price impact comes from your own swap. Slippage is the difference between the quote you see and what executes later.</p></article><article><span className="lesson-number">03</span><h3>A model, not a quote.</h3><p>This uses a constant-product pool with a 0.3% fee. It leaves out gas, token taxes, other trades and concentrated liquidity.</p></article></div></section>

      <details className="model-details"><summary>Look under the hood <span className="small-label">The math & assumptions</span><Icon name="expand" /></summary><div><p>These are fictional pools and a generic TOKEN, with the same starting rate of 10,000 tokens per ETH. No prices or reserves are fetched. ETH represents the wrapped ETH side of the example pool.</p><p><code>effective input = ETH in × (1 − {FEE})</code><br /><code>tokens out = token reserve × effective input / (ETH reserve + effective input)</code></p><p>Price impact is the percentage shortfall against the starting reserve ratio, after deducting the same pool fee from both estimates. The fee stays in the pool. Each edit starts from the original reserves; swaps do not accumulate.</p><p>Results use browser decimal arithmetic and rounded display values. They do not model contract integer rounding, execution, routing, or slippage tolerance.</p></div></details>

      <footer className="site-footer"><div className="footer-mark" aria-hidden="true"><Icon name="swap" /></div><p>Built for curious holders. Swap Lab is a small, local experiment for the BluePrint Ground sheet: we built it to make the relationship between swap size, liquidity and price impact easier to see in under a minute.</p><span className="offline-label"><Icon name="check" /> Runs entirely in your browser</span></footer>
    </main>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
