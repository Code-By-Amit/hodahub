import { db } from '@/lib/db';
import { categories, categoryRelations, products } from '@/lib/db/schema';
import { asc, eq, sql, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { checkCategoryCycle } from '@/lib/category-tree';

// In-memory cache for category relations hierarchy with TTL
let relationsCache = null;
let relationsCacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateCategoryRelationsCache() {
  relationsCache = null;
  relationsCacheTimestamp = 0;
}

export const categoryService = {
  /**
   * Fetches all category relations with in-memory caching to avoid hitting DB repeatedly
   */
  async getCategoryRelations() {
    const now = Date.now();
    if (relationsCache && now - relationsCacheTimestamp < CACHE_TTL_MS) {
      return relationsCache;
    }
    const relations = await db.select().from(categoryRelations);
    relationsCache = relations;
    relationsCacheTimestamp = now;
    return relations;
  },

  /**
   * Recursively resolves all descendant category IDs starting from a root category ID
   */
  async getDescendantCategoryIds(categoryId) {
    const allRelations = await this.getCategoryRelations();
    const MAX_DEPTH = 50;
    const descendantIds = new Set([categoryId]);
    const queue = [{ id: categoryId, depth: 0 }];

    while (queue.length > 0) {
      const { id: currentParentId, depth } = queue.shift();
      if (depth >= MAX_DEPTH) continue;
      const children = allRelations.filter((r) => r.parentId === currentParentId);
      for (const child of children) {
        if (!descendantIds.has(child.categoryId)) {
          descendantIds.add(child.categoryId);
          queue.push({ id: child.categoryId, depth: depth + 1 });
        }
      }
    }

    return Array.from(descendantIds);
  },

  /**
   * Admin: List all categories with their associated parent IDs
   */
  async getAdminCategories() {
    const [list, relations] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.name)),
      db.select().from(categoryRelations),
    ]);

    const parentMap = {};
    relations.forEach((rel) => {
      if (!parentMap[rel.categoryId]) parentMap[rel.categoryId] = [];
      parentMap[rel.categoryId].push(rel.parentId);
    });

    return list.map((cat) => ({
      ...cat,
      parentIds: parentMap[cat.id] || [],
    }));
  },

  /**
   * Admin: Create a new category with multi-parent relationships
   */
  async createCategory({ name, slug, imageUrl, parentIds }) {
    const normalizedParentIds = Array.from(
      new Set(Array.isArray(parentIds) ? parentIds.filter(Boolean) : [])
    );

    const formattedSlug = slug.toLowerCase().replace(/\s+/g, '-');
    const [existingSlug] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, formattedSlug))
      .limit(1);

    if (existingSlug) {
      const error = new Error('A category with this slug already exists');
      error.status = 400;
      throw error;
    }

    if (normalizedParentIds.length > 0) {
      const existingParents = await db
        .select({ id: categories.id })
        .from(categories)
        .where(inArray(categories.id, normalizedParentIds));

      if (existingParents.length !== normalizedParentIds.length) {
        const error = new Error('One or more parent categories do not exist');
        error.status = 400;
        throw error;
      }
    }

    const allRelations = await db.select().from(categoryRelations);
    const cycleCheck = checkCategoryCycle(null, normalizedParentIds, allRelations);
    if (cycleCheck.hasCycle) {
      const error = new Error(cycleCheck.reason);
      error.status = 400;
      throw error;
    }

    const [category] = await db
      .insert(categories)
      .values({
        name,
        slug: formattedSlug,
        imageUrl: imageUrl || null,
      })
      .returning();

    if (normalizedParentIds.length > 0) {
      await db.insert(categoryRelations).values(
        normalizedParentIds.map((pId) => ({
          categoryId: category.id,
          parentId: pId,
        }))
      );
    }

    invalidateCategoryRelationsCache();

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/categories');
      revalidatePath('/products');
    } catch {}

    return { ...category, parentIds: normalizedParentIds };
  },

  /**
   * Admin: Update category metadata and parent relations
   */
  async updateCategory(id, { name, slug, imageUrl, parentIds }) {
    const formattedSlug = slug ? slug.toLowerCase().replace(/\s+/g, '-') : undefined;

    if (formattedSlug) {
      const [existingSlug] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.slug, formattedSlug), sql`${categories.id} != ${id}`))
        .limit(1);

      if (existingSlug) {
        const error = new Error('A category with this slug already exists');
        error.status = 400;
        throw error;
      }
    }

    if (parentIds !== undefined) {
      const normalizedParentIds = Array.from(
        new Set(Array.isArray(parentIds) ? parentIds.filter(Boolean) : [])
      );

      if (normalizedParentIds.length > 0) {
        const existingParents = await db
          .select({ id: categories.id })
          .from(categories)
          .where(inArray(categories.id, normalizedParentIds));

        if (existingParents.length !== normalizedParentIds.length) {
          const error = new Error('One or more parent categories do not exist');
          error.status = 400;
          throw error;
        }
      }

      const allRelations = await db.select().from(categoryRelations);
      const cycleCheck = checkCategoryCycle(id, normalizedParentIds, allRelations);
      if (cycleCheck.hasCycle) {
        const error = new Error(cycleCheck.reason);
        error.status = 400;
        throw error;
      }

      await db.delete(categoryRelations).where(eq(categoryRelations.categoryId, id));
      if (normalizedParentIds.length > 0) {
        await db.insert(categoryRelations).values(
          normalizedParentIds.map((pId) => ({
            categoryId: id,
            parentId: pId,
          }))
        );
      }
    }

    const [cat] = await db
      .update(categories)
      .set({
        ...(name && { name }),
        ...(formattedSlug && { slug: formattedSlug }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
      })
      .where(eq(categories.id, id))
      .returning();

    if (!cat) {
      const error = new Error('Category not found');
      error.status = 404;
      throw error;
    }

    invalidateCategoryRelationsCache();

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/categories');
      revalidatePath('/products');
    } catch {}

    const updatedRelations = await db
      .select()
      .from(categoryRelations)
      .where(eq(categoryRelations.categoryId, id));

    return {
      ...cat,
      parentIds: updatedRelations.map((r) => r.parentId),
    };
  },

  /**
   * Admin: Delete category if no products or child categories are assigned
   */
  async deleteCategory(id) {
    const [{ childCount }] = await db
      .select({ childCount: sql`count(*)::int` })
      .from(categoryRelations)
      .where(eq(categoryRelations.parentId, id));

    if (childCount > 0) {
      const error = new Error(
        `Cannot delete category: ${childCount} child category/categories exist. Please reassign or delete child categories first.`
      );
      error.status = 400;
      throw error;
    }

    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(products)
      .where(eq(products.categoryId, id));

    if (count > 0) {
      const error = new Error(
        `Cannot delete category: ${count} product(s) are assigned to it. Please reassign or delete the products first.`
      );
      error.status = 400;
      throw error;
    }

    await db.delete(categories).where(eq(categories.id, id));

    invalidateCategoryRelationsCache();

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/categories');
      revalidatePath('/products');
    } catch {}

    return { success: true };
  },

  /**
   * Public: Get public categories tree and list with cached relations
   */
  async getPublicTree() {
    const [allCategories, allRelations] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.name)),
      this.getCategoryRelations(),
    ]);
    const { buildCategoryTree } = await import('@/lib/category-tree');
    return buildCategoryTree(allCategories, allRelations);
  },
};
