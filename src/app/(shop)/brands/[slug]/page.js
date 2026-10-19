import { notFound } from 'next/navigation';
import { brandService } from '@/services/brand.service';
import BrandDetailClient from './BrandDetailClient';

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const { category } = (await searchParams) || {};

  try {
    const data = await brandService.getBrandCategoryHierarchy({
      slug,
      categorySlug: category || null,
    });

    if (!data || !data.brand) {
      return {
        title: 'Brand Not Found — HodaHub',
      };
    }

    const { brand, selectedCategory } = data;

    if (selectedCategory) {
      return {
        title: `${brand.name} - ${selectedCategory.name} — HodaHub`,
        description: `Shop authentic ${brand.name} ${selectedCategory.name} products with guaranteed quality and fast delivery.`,
        alternates: {
          canonical: `/brands/${brand.slug}?category=${selectedCategory.slug}`,
        },
      };
    }

    return {
      title: `${brand.name} Products — HodaHub`,
      description: `Shop authentic ${brand.name} products with guaranteed quality and fast delivery.`,
      alternates: {
        canonical: `/brands/${brand.slug}`,
      },
    };
  } catch {
    return {
      title: 'Brand Not Found — HodaHub',
    };
  }
}

export default async function BrandDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const { category, view } = (await searchParams) || {};

  let hierarchyData = null;
  try {
    hierarchyData = await brandService.getBrandCategoryHierarchy({
      slug,
      categorySlug: category || null,
    });
  } catch {
    notFound();
  }

  if (!hierarchyData || !hierarchyData.brand) {
    notFound();
  }

  return (
    <BrandDetailClient
      initialBrand={hierarchyData.brand}
      initialCategories={hierarchyData.categories}
      initialSelectedCategory={hierarchyData.selectedCategory}
      initialBreadcrumbs={hierarchyData.breadcrumbs}
      initialIsSingleCategory={hierarchyData.isSingleCategory}
      initialView={view || null}
    />
  );
}
