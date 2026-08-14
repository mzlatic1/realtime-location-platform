import { describe, it, expect } from 'vitest';
import { generate, rng } from '../apps/simulator/src/generator.js';
describe('simulator', () => {
  it('has deterministic coordinates', () => {
    const a = generate(42, 1, 2),
      b = generate(42, 1, 2);
    expect([a.latitude, a.longitude]).toEqual([b.latitude, b.longitude]);
  });
  it('has deterministic RNG', () => {
    expect(rng(2)()).toBe(rng(2)());
  });
});
