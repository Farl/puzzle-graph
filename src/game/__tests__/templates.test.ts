import { describe, it, expect } from 'vitest';
import type { KeyTemplate, LockTemplate } from '../types';

describe('Template types', () => {
  it('KeyTemplate has required fields', () => {
    const key: KeyTemplate = {
      id: 'crowbar',
      name: '撬棍',
      description: '一根堅固的金屬撬棍。',
      type: 'tool',
      reusable: true,
      volume: 3,
    };
    expect(key.id).toBe('crowbar');
    expect(key.reusable).toBe(true);
    expect(key.volume).toBe(3);
  });

  it('LockTemplate has required fields including tags and requiredKeys', () => {
    const lock: LockTemplate = {
      id: 'nailed_box',
      name: '被釘住的木箱',
      lockedDescription: '木箱被粗大的鐵釘釘死。',
      unlockDescription: '你用撬棍拔出了鐵釘，撬開了木板。',
      category: 'container',
      mechanism: 'physical',
      maxItems: 3,
      tags: ['physical', 'brute-force'],
      requiredKeys: ['crowbar'],
      variations: [
        { name: '被釘住的木箱', lockMsg: '木箱被粗大的鐵釘釘死。', unlockMsg: '你用撬棍拔出了鐵釘，撬開了木板。' },
      ],
    };
    expect(lock.tags).toContain('physical');
    expect(lock.requiredKeys).toContain('crowbar');
    expect(lock.maxItems).toBe(3);
  });

  it('same KeyTemplate.id can appear in multiple LockTemplates', () => {
    const crowbar: KeyTemplate = {
      id: 'crowbar',
      name: '撬棍',
      description: '一根堅固的金屬撬棍。',
      type: 'tool',
      reusable: true,
      volume: 3,
    };

    const lock1: LockTemplate = {
      id: 'nailed_box',
      name: '被釘住的木箱',
      lockedDescription: '',
      unlockDescription: '',
      category: 'container',
      mechanism: 'physical',
      maxItems: 3,
      tags: ['physical'],
      requiredKeys: [crowbar.id],
      variations: [{ name: '被釘住的木箱', lockMsg: '', unlockMsg: '' }],
    };

    const lock2: LockTemplate = {
      id: 'loose_floor',
      name: '鬆動的地板',
      lockedDescription: '',
      unlockDescription: '',
      category: 'container',
      mechanism: 'physical',
      maxItems: 2,
      tags: ['physical'],
      requiredKeys: [crowbar.id],
      variations: [{ name: '鬆動的地板', lockMsg: '', unlockMsg: '' }],
    };

    expect(lock1.requiredKeys[0]).toBe(lock2.requiredKeys[0]);
    expect(lock1.requiredKeys[0]).toBe('crowbar');
  });
});
