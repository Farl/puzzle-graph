interface Taggable {
  tags: readonly string[];
}

/**
 * Filter a template pool by include/exclude tag sets.
 * - An empty or undefined include list means "no include filter" (keep everything not excluded).
 * - Include is a disjunction: keep if any include-tag matches.
 * - Exclude is a disjunction: drop if any exclude-tag matches.
 * - Exclude wins over include.
 */
export function filterTemplatesByTags<T extends Taggable>(
  templates: readonly T[],
  includeTags: readonly string[] | undefined,
  excludeTags: readonly string[] | undefined,
): T[] {
  const includeSet = includeTags && includeTags.length > 0 ? new Set(includeTags) : null;
  const excludeSet = excludeTags && excludeTags.length > 0 ? new Set(excludeTags) : null;
  return templates.filter(t => {
    if (excludeSet && t.tags.some(tag => excludeSet.has(tag))) return false;
    if (includeSet && !t.tags.some(tag => includeSet.has(tag))) return false;
    return true;
  });
}
