import { describe, it, expect } from 'vitest';
import { filterTemplatesByTags } from '../template-filter';
import { generatePuzzle } from '../generator';
import { LOCK_TEMPLATES } from '../templates';
import type { GeneratorConfig } from '../types';

const SAMPLE = [
  { id: 'a', tags: ['classic', 'tool'] },
  { id: 'b', tags: ['investigation', 'npc'] },
  { id: 'c', tags: ['classic', 'crafting'] },
  { id: 'd', tags: ['investigation', 'evidence'] },
];

describe('filterTemplatesByTags', () => {
  it('no filter returns all', () => {
    const result = filterTemplatesByTags(SAMPLE, undefined, undefined);
    expect(result.map(t => t.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('include: classic only', () => {
    const result = filterTemplatesByTags(SAMPLE, ['classic'], undefined);
    expect(result.map(t => t.id)).toEqual(['a', 'c']);
  });

  it('include: investigation only', () => {
    const result = filterTemplatesByTags(SAMPLE, ['investigation'], undefined);
    expect(result.map(t => t.id)).toEqual(['b', 'd']);
  });

  it('exclude: investigation', () => {
    const result = filterTemplatesByTags(SAMPLE, undefined, ['investigation']);
    expect(result.map(t => t.id)).toEqual(['a', 'c']);
  });

  it('include + exclude both applied', () => {
    const result = filterTemplatesByTags(SAMPLE, ['classic', 'investigation'], ['crafting']);
    expect(result.map(t => t.id)).toEqual(['a', 'b', 'd']);
  });

  it('empty include array means no filter (not "match nothing")', () => {
    const result = filterTemplatesByTags(SAMPLE, [], undefined);
    expect(result.map(t => t.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('GeneratorContext tag filter', () => {
  it('excludeTemplateTags=["investigation"] uses only classic templates', () => {
    const config: GeneratorConfig = {
      targetDepth: 4,
      maxRooms: 3,
      depthStaggerVariance: 1,
      excludeTemplateTags: ['investigation'],
      seed: 42,
    };
    const puzzle = generatePuzzle(config);
    for (const lock of Object.values(puzzle.locks)) {
      if (lock.isExit) continue;
      const tpl = LOCK_TEMPLATES.find(t => t.variations.some(v => v.name === lock.name) ||
        t.variations.some(v => lock.name.startsWith(v.name)));
      if (tpl) expect(tpl.tags).toContain('classic');
    }
  });

  it('filter preserves solvability', async () => {
    const { solvePuzzle } = await import('../solver');
    const config: GeneratorConfig = {
      targetDepth: 4,
      maxRooms: 3,
      depthStaggerVariance: 1,
      excludeTemplateTags: ['investigation'],
    };
    for (let i = 0; i < 20; i++) {
      const puzzle = generatePuzzle({ ...config, seed: i });
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `seed=${i} not solvable`).toBe(true);
    }
  });
});

describe('投查模式可解性', () => {
  const INVESTIGATION_BASE: GeneratorConfig = {
    targetDepth: 6,
    maxRooms: 4,
    depthStaggerVariance: 1,
    compositeRate: 0.5,
    reuseRate: 0.6,
    maxReusesPerTool: 3,
    crossRoomRate: 0.5,
    stateLockRate: 0.3,
    npcRate: 0.7,
    includeTemplateTags: ['investigation'],
  };

  it('純 investigation tag 過濾：100 次全部可解', async () => {
    const { solvePuzzle } = await import('../solver');
    let npcSeen = 0;
    for (let i = 0; i < 100; i++) {
      const puzzle = generatePuzzle({ ...INVESTIGATION_BASE, seed: i });
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `seed=${i} not solvable: ${result.blockedItems.join(', ')}`).toBe(true);
      for (const lock of Object.values(puzzle.locks)) {
        const tpl = LOCK_TEMPLATES.find(t => t.variations.some(v =>
          lock.name === v.name || lock.name.startsWith(v.name)));
        if (tpl?.tags.includes('npc')) { npcSeen++; break; }
      }
    }
    expect(npcSeen, 'NPC locks never appeared across 100 seeds').toBeGreaterThan(10);
  });

  it('mixed 模式（無 filter）：50 次全部可解', async () => {
    const { solvePuzzle } = await import('../solver');
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle({ ...INVESTIGATION_BASE, includeTemplateTags: undefined, seed: i });
      const result = solvePuzzle(puzzle);
      expect(result.solvable, `seed=${i} not solvable`).toBe(true);
    }
  });

  it('classic-only 模式：50 次全部可解，且無 investigation 鎖', async () => {
    const { solvePuzzle } = await import('../solver');
    for (let i = 0; i < 50; i++) {
      const puzzle = generatePuzzle({
        ...INVESTIGATION_BASE,
        includeTemplateTags: undefined,
        excludeTemplateTags: ['investigation'],
        seed: i,
      });
      const result = solvePuzzle(puzzle);
      expect(result.solvable).toBe(true);
      for (const lock of Object.values(puzzle.locks)) {
        const tpl = LOCK_TEMPLATES.find(t => t.variations.some(v =>
          lock.name === v.name || lock.name.startsWith(v.name)));
        if (tpl) expect(tpl.tags).not.toContain('investigation');
      }
    }
  });
});
