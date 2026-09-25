'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProductForm } from '../../new/page';

export default function EditProductPage() {
  const { id } = useParams();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/products/${id}`);
        const data = await res.json();
        if (res.ok) {
          const p = data.product;
          setInitialData({
            name: p.name, slug: p.slug, description: p.description || '',
            price: p.price, discountPrice: p.discountPrice || '',
            categoryId: p.categoryId || '', brandId: p.brandId || '', stock: p.stock.toString(),
            images: p.images || [], specifications: p.specifications || [],
            addonIds: p.addonIds || (p.addons || []).map((a) => a.id),
            addonLinks: p.addonLinks || [],
            isActive: p.isActive,
            showOnHome: p.showOnHome !== false,
            codAvailable: p.codAvailable ?? true,
            isBestSeller: p.isBestSeller ?? false,
            productLink: p.productLink || '',
          });
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="h-40 shimmer rounded-md" />;
  if (!initialData) return <p className="text-warm-500 text-[11px]">Product not found</p>;

  return <ProductForm initialData={initialData} productId={id} />;
}