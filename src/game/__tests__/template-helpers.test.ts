import { describe, it, expect } from 'vitest';
import { findKeyTemplate, findLocksForKey, findLocksByTag, findLocksByCategory } from '../templates';

describe('Template helper functions', () => {
  it('findKeyTemplate returns template by id', () => {
    const key = findKeyTemplate('crowbar');
    expect(key).toBeDefined();
    expect(key!.name).toBe('撬棍');
  });

  it('findKeyTemplate returns undefined for unknown id', () => {
    expect(findKeyTemplate('nonexistent')).toBeUndefined();
  });

  it('findLocksForKey returns all locks that accept a given key', () => {
    const locks = findLocksForKey('crowbar');
    expect(locks.length).toBeGreaterThanOrEqual(1);
    expect(locks.every(l => l.requiredKeys.includes('crowbar'))).toBe(true);
  });

  it('findLocksByTag returns locks matching a tag', () => {
    const locks = findLocksByTag('password');
    expect(locks.length).toBeGreaterThan(0);
    expect(locks.every(l => l.tags.includes('password'))).toBe(true);
  });

  it('findLocksByCategory filters by container or spatial', () => {
    const containers = findLocksByCategory('container');
    const spatials = findLocksByCategory('spatial');
    expect(containers.every(l => l.category === 'container')).toBe(true);
    expect(spatials.every(l => l.category === 'spatial')).toBe(true);
  });
});
