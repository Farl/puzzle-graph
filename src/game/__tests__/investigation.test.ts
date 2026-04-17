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
