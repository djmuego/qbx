export interface RandomSource {
  next(): number;
  range(min: number, max: number): number;
}

export class MathRandomSource implements RandomSource {
  next(): number {
    return Math.random();
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export class SeededRandomSource implements RandomSource {
  private seed: number;

  constructor(seed = 1) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}
