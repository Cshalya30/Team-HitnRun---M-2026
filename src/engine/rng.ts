/**
 * Deterministic PRNG using Mulberry32 algorithm.
 * Guarantees byte-identical execution across machines and browser environments.
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * Generates a deterministic float in range [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates an integer in range [min, max] inclusive
   */
  intBetween(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generates a float in range [min, max)
   */
  floatBetween(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Randomly selects an item from an array
   */
  pickOne<T>(items: readonly T[]): T {
    const idx = Math.floor(this.next() * items.length);
    return items[idx];
  }

  /**
   * Gaussian / Normal distribution via Box-Muller transform
   */
  gaussian(mean = 0, stdDev = 1): number {
    const u1 = Math.max(1e-7, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Shuffles an array deterministically (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
