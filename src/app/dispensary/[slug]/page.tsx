import { notFound } from 'next/navigation';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import { Dispensary, Product } from '@/lib/types';
import DispensaryDetailClient from './client-page';
import { query } from '@/lib/db';

// Helper to serialize dates for client components
const serializeDate = (date: any): string | null => {
  if (!date) return null;
  return new Date(date).toISOString();
};

const mapDispensary = (d: any): Dispensary => ({
  ...d,
  coordinates: typeof d.coordinates === 'string' ? JSON.parse(d.coordinates) : d.coordinates,
  offers: typeof d.offers === 'string' ? JSON.parse(d.offers) : d.offers,
  hours: typeof d.hours === 'string' ? JSON.parse(d.hours) : d.hours,
  categoryIds: typeof d.categoryIds === 'string' ? JSON.parse(d.categoryIds) : d.categoryIds,
  createdAt: serializeDate(d.createdAt),
  updatedAt: serializeDate(d.updatedAt),
  isFeatured: Boolean(d.isFeatured),
});

const mapProduct = (p: any): Product => ({
  ...p,
  pricing: typeof p.pricing === 'string' ? JSON.parse(p.pricing) : p.pricing,
  ediblePricing: typeof p.ediblePricing === 'string' ? JSON.parse(p.ediblePricing) : p.ediblePricing,
  sodaPricing: typeof p.sodaPricing === 'string' ? JSON.parse(p.sodaPricing) : p.sodaPricing,
  additionalImageUrls: typeof p.additionalImageUrls === 'string' ? JSON.parse(p.additionalImageUrls) : p.additionalImageUrls,
  createdAt: serializeDate(p.createdAt),
  updatedAt: serializeDate(p.updatedAt),
  isFeatured: Boolean(p.isFeatured),
  isHotDeal: Boolean(p.isHotDeal),
});

async function getDispensaryBySlug(slug: string): Promise<Dispensary | null> {
  try {
    const rows = await query<any[]>('SELECT * FROM `dispensary` WHERE slug = ?', [slug]);
    const dispensary = rows[0];
    if (!dispensary) return null;
    return mapDispensary(dispensary);
  } catch (error) {
    console.error("Error fetching dispensary by slug:", error);
    return null;
  }
}

async function getProductsForDispensary(dispensaryId: string): Promise<Product[]> {
  try {
    const rows = await query<any[]>('SELECT * FROM `product` WHERE dispensaryId = ?', [dispensaryId]);
    return rows.map(mapProduct);
  } catch (error) {
    console.error("Error fetching products for dispensary:", error);
    return [];
  }
}

export default async function DispensaryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dispensary = await getDispensaryBySlug(slug);

  if (!dispensary || !dispensary.id) {
    notFound();
  }

  const products = await getProductsForDispensary(dispensary.id);

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <HeaderProvider />
      <DispensaryDetailClient dispensary={dispensary} products={products} />
      <Footer />
    </div>
  );
}
