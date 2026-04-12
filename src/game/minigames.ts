import type { MinigameConfig } from './types';
import { SeededRandom } from './utils';

// ─── 小遊戲生成器介面 ───

export interface MinigameGenerator {
  generate(rng: SeededRandom): MinigameConfig;
}

// ─── 具體小遊戲生成器 ───

const pipePuzzleGenerator: MinigameGenerator = {
  generate(rng) {
    const gridSize = 4 + rng.nextInt(2); // 4x4 or 5x5
    return { type: 'pipe_puzzle', seed: rng.nextInt(1_000_000), params: { gridSize } };
  },
};

const wiringPuzzleGenerator: MinigameGenerator = {
  generate(rng) {
    const pairCount = 3 + rng.nextInt(3); // 3-5 pairs
    return { type: 'wiring', seed: rng.nextInt(1_000_000), params: { pairCount } };
  },
};

// ─── 小遊戲登錄表 ───

const MINIGAME_REGISTRY: Record<string, MinigameGenerator> = {
  pipe_puzzle: pipePuzzleGenerator,
  wiring: wiringPuzzleGenerator,
};

/**
 * 依類型生成小遊戲配置。
 * 若類型不在登錄表中，則拋出錯誤。
 */
export function generateMinigameConfig(type: string, rng: SeededRandom): MinigameConfig {
  const generator = MINIGAME_REGISTRY[type];
  if (!generator) throw new Error(`Unknown minigame type: ${type}`);
  return generator.generate(rng);
}
