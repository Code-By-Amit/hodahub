import { notFound } from 'next/navigation';
import { brandService } from '@/services/brand.service';
import BrandDetailClient from './BrandDetailClient';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const brand = await brandService.getBrandBySlug(slug);
    if (!brand) {
      return {
        title: 'Brand Not Found — HodaHub',
      };
    }
    return {
      title: `${brand.name} Products — HodaHub`,
      description: `Shop authentic ${brand.name} products with guaranteed quality and fast delivery.`,
    };
  } catch {
    return {
      title: 'Brand Not Found — HodaHub',
    };
  }
}

export default async function BrandDetailPage({ params }) {
  const { slug } = await params;
  let brand = null;
  try {
    brand = await brandService.getBrandBySlug(slug);
  } catch {
    notFound();
  }

  if (!brand) {
    notFound();
  }

  return <BrandDetailClient initialBrand={brand} />;
}
