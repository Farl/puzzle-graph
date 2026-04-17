import { describe, it, expect } from 'vitest';
import { filterTemplatesByTags } from '../template-filter';

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
