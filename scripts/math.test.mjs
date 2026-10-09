import test from 'node:test';
import assert from 'node:assert/strict';
import { FEE, POOLS, parseAmount, percent, simulate } from '../web/src/math.ts';

const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(b)), `${a} differs from ${b}`);

test('known exact-input examples match independent rational arithmetic', () => {
  for (const pool of POOLS) {
    // 1 ETH × 997/1000; keep integer arithmetic until the final division.
    const numerator = BigInt(pool.tokens) * 997n * 1_000_000n;
    const expected = Number(numerator / (BigInt(pool.eth) * 1000n + 997n)) / 1_000_000;
    near(simulate(1, pool).output, expected, 1e-9);
  }
  near(simulate(1, POOLS[1]).output, 9871.580343970612);
  near(simulate(1, POOLS[1]).impact, 0.9871580343970614);
});

test('fee and price-impact definitions agree with the reported output', () => {
  const r = simulate(5, POOLS[0]);
  near(r.fee, .015);
  near(r.idealAfterFee, 49_850);
  near((1 - r.output / r.idealAfterFee) * 100, r.impact);
  near(r.fewerTokens + r.output, r.idealAfterFee);
});

test('a deeper pool returns more tokens at the same starting rate', () => {
  for (const amount of [.000001, .1, 1, 5, 100, 10000]) {
    const results = POOLS.map(p => simulate(amount, p));
    assert.ok(results[0].output < results[1].output && results[1].output < results[2].output);
    assert.ok(results[0].impact > results[1].impact && results[1].impact > results[2].impact);
  }
});

test('1,000 bounded inputs preserve reserves, fees, finite results and monotonicity', () => {
  let seed = 0x71f00d;
  for (let i = 0; i < 1000; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const amount = .000001 + (seed / 0xffffffff) * 9999.999999;
    for (const pool of POOLS) {
      const r = simulate(amount, pool);
      assert.ok(Number.isFinite(r.output) && r.output > 0 && r.output < pool.tokens);
      assert.ok(r.impact > 0 && r.impact < 100);
      near(r.fee, amount * FEE);
      assert.ok(simulate(amount / 2, pool).impact < r.impact);
      assert.ok(simulate(amount / 2, pool).output < r.output);
      // With the fee retained, the reserves' product cannot shrink.
      assert.ok((pool.eth + amount) * (pool.tokens - r.output) >= pool.eth * pool.tokens * (1 - 1e-12));
    }
  }
});

test('decimal amount parsing accepts boundaries and rejects ambiguous or invalid inputs', () => {
  for (const raw of ['', ' ', '0', '-1', '1e3', '1,000', 'NaN', 'Infinity', '10000.01', '0.0000001', '.', '1.2.3', 'abc']) {
    assert.equal(parseAmount(raw), null, raw);
  }
  for (const raw of ['0.000001', '10000', '1', ' 5 ', '.1', '1.25']) assert.equal(parseAmount(raw), Number(raw));
});

test('zero chart origin is defined and invalid simulation inputs are rejected', () => {
  assert.equal(simulate(0, POOLS[0]).output, 0);
  assert.equal(simulate(0, POOLS[0]).impact, 0);
  for (const value of [NaN, Infinity, -1, 10001]) assert.throws(() => simulate(value, POOLS[0]), RangeError);
});

test('tiny nonzero impact is not misleadingly formatted as zero', () => {
  assert.equal(percent(.00001), '<0.01%');
  assert.equal(percent(0), '0%');
  assert.equal(percent(9.0661089), '9.07%');
});
