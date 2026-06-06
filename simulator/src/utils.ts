export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1));
}

export function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

export function randomBoolean(): boolean {
  return Math.random() < 0.5;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getTimestamp(): number {
  return Date.now();
}

export function withProbability(probability: number): boolean {
  return Math.random() < probability;
}
