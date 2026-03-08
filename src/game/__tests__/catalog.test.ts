import { describe, it, expect } from 'vitest';
import { KEY_TEMPLATES, LOCK_TEMPLATES } from '../templates';

describe('Template catalog', () => {
  it('all KeyTemplate ids are unique', () => {
    const ids = KEY_TEMPLATES.map(k => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all LockTemplate ids are unique', () => {
    const ids = LOCK_TEMPLATES.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every LockTemplate.requiredKeys references existing KeyTemplate', () => {
    const keyIds = new Set(KEY_TEMPLATES.map(k => k.id));
    for (const lock of LOCK_TEMPLATES) {
      for (const keyRef of lock.requiredKeys) {
        expect(keyIds.has(keyRef), `Lock "${lock.id}" references unknown key "${keyRef}"`).toBe(true);
      }
    }
  });

  it('every LockTemplate has at least one tag', () => {
    for (const lock of LOCK_TEMPLATES) {
      expect(lock.tags.length, `Lock "${lock.id}" has no tags`).toBeGreaterThan(0);
    }
  });

  it('every LockTemplate has at least one variation', () => {
    for (const lock of LOCK_TEMPLATES) {
      expect(lock.variations.length, `Lock "${lock.id}" has no variations`).toBeGreaterThan(0);
    }
  });

  it('has both container and spatial locks', () => {
    const containers = LOCK_TEMPLATES.filter(l => l.category === 'container');
    const spatials = LOCK_TEMPLATES.filter(l => l.category === 'spatial');
    expect(containers.length).toBeGreaterThan(0);
    expect(spatials.length).toBeGreaterThan(0);
  });

  it('has both reusable and consumable keys', () => {
    const reusable = KEY_TEMPLATES.filter(k => k.reusable);
    const consumable = KEY_TEMPLATES.filter(k => !k.reusable);
    expect(reusable.length).toBeGreaterThan(0);
    expect(consumable.length).toBeGreaterThan(0);
  });
});
