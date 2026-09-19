/**
 * Category Tree, Cycle Detection, and Breadcrumbs Utility
 */

/**
 * Checks if adding `proposedParentIds` for `categoryId` creates a cycle in the directed category graph.
 * @param {string} categoryId - The ID of the category being created or updated (may be null for new categories).
 * @param {string[]} proposedParentIds - Array of parent category IDs to assign.
 * @param {Array<{ categoryId: string, parentId: string }>} allRelations - All existing category relations in DB.
 * @returns {{ hasCycle: boolean, reason?: string }}
 */
export function checkCategoryCycle(categoryId, proposedParentIds = [], allRelations = []) {
  if (!categoryId || !proposedParentIds.length) {
    return { hasCycle: false };
  }

  // Filter out any existing relations belonging to the category being edited
  const existingRelations = allRelations.filter((rel) => rel.categoryId !== categoryId);

  // Build parent map for fast lookup: categoryId -> set of parentIds
  const parentMap = new Map();
  for (const rel of existingRelations) {
    if (!parentMap.has(rel.categoryId)) {
      parentMap.set(rel.categoryId, new Set());
    }
    parentMap.get(rel.categoryId).add(rel.parentId);
  }

  for (const proposedParentId of proposedParentIds) {
    // 1. Direct self-reference check
    if (proposedParentId === categoryId) {
      return {
        hasCycle: true,
        reason: 'A category cannot be its own parent.',
      };
    }

    // 2. Ancestor traversal starting from proposedParentId upwards
    // If we ever reach categoryId while going up from proposedParentId, it's a cycle!
    const queue = [proposedParentId];
    const visited = new Set([proposedParentId]);

    while (queue.length > 0) {
      const current = queue.shift();
      const parentsOfCurrent = parentMap.get(current);

      if (parentsOfCurrent) {
        for (const parent of parentsOfCurrent) {
          if (parent === categoryId) {
            return {
              hasCycle: true,
              reason: 'Setting this parent category creates a circular relationship (cycle).',
            };
          }
          if (!visited.has(parent)) {
            visited.add(parent);
            queue.push(parent);
          }
        }
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Builds multi-parent tree hierarchy from flat categories and relations.
 * Categories with 0 parents are returned as root categories.
 */
export function buildCategoryTree(allCategories = [], allRelations = []) {
  const categoryMap = new Map();

  allCategories.forEach((cat) => {
    categoryMap.set(cat.id, {
      ...cat,
      parentIds: [],
      children: [],
    });
  });

  allRelations.forEach((rel) => {
    const child = categoryMap.get(rel.categoryId);
    const parent = categoryMap.get(rel.parentId);
    if (child && parent) {
      child.parentIds.push(rel.parentId);
      parent.children.push(child);
    }
  });

  // Root categories have no parents
  const rootCategories = Array.from(categoryMap.values()).filter(
    (cat) => cat.parentIds.length === 0
  );

  return {
    rootCategories,
    categoryMap: Object.fromEntries(categoryMap),
    allCategories: Array.from(categoryMap.values()),
  };
}

/**
 * Generates a representative primary breadcrumb path for a category by following its first parent.
 */
export function getPrimaryBreadcrumbs(targetCategoryId, allCategories = [], allRelations = []) {
  const categoryMap = new Map();
  allCategories.forEach((cat) => categoryMap.set(cat.id, { ...cat, parentIds: [] }));

  allRelations.forEach((rel) => {
    const child = categoryMap.get(rel.categoryId);
    if (child) {
      child.parentIds.push(rel.parentId);
    }
  });

  const path = [];
  const visited = new Set();
  let currentId = targetCategoryId;

  while (currentId && categoryMap.has(currentId) && !visited.has(currentId)) {
    visited.add(currentId);
    const cat = categoryMap.get(currentId);
    path.unshift({ id: cat.id, name: cat.name, slug: cat.slug });

    // Step up to its first parent if any
    currentId = cat.parentIds.length > 0 ? cat.parentIds[0] : null;
  }

  return path;
}
