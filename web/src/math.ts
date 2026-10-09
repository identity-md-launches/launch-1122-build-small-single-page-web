export const FEE = 0.003;
export const TOKEN_RATE = 10_000;
export const POOLS = [
  { id: 'shallow', name: 'Shallow', eth: 10, tokens: 100_000, caption: '10 ETH' },
  { id: 'medium', name: 'Medium', eth: 100, tokens: 1_000_000, caption: '100 ETH' },
  { id: 'deep', name: 'Deep', eth: 1_000, tokens: 10_000_000, caption: '1,000 ETH' },
] as const;
export type Pool = (typeof POOLS)[number];

export function parseAmount(raw: string): number | null {
  if (!/^\d*\.?\d+$/.test(raw.trim())) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0.000001 && value <= 10_000 ? value : null;
}

// One exact-input, constant-product swap. Fees stay in the input reserve.
// Price impact compares execution after fees with the starting reserve ratio.
export function simulate(amount: number, pool: Pool) {
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000) {
    throw new RangeError('Amount must be between 0 and 10,000 ETH.');
  }
  const fee = amount * FEE;
  const effective = amount * (1 - FEE);
  const output = (pool.tokens * effective) / (pool.eth + effective);
  const impact = (effective / (pool.eth + effective)) * 100;
  const idealAfterFee = effective * (pool.tokens / pool.eth);
  return { output, impact, fee, effective, idealAfterFee, fewerTokens: idealAfterFee - output };
}

export function number(value: number, digits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

export function percent(value: number) {
  return value > 0 && value < 0.01 ? '<0.01%' : `${number(value)}%`;
}
