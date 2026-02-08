import { notFound } from 'next/navigation';
import { Dispensary, Product } from '@/lib/types';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import ProductDetailClient from './client-page';
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

async function getProductBySlug(dispensaryId: string, productSlug: string): Promise<Product | null> {
  try {
    const rows = await query<any[]>('SELECT * FROM `product` WHERE dispensaryId = ? AND slug = ?', [dispensaryId, productSlug]);
    let product = rows[0];

    if (!product) {
      // Fallback to ID
      const rowsById = await query<any[]>('SELECT * FROM `product` WHERE id = ? AND dispensaryId = ?', [productSlug, dispensaryId]);
      product = rowsById[0];
    }

    if (!product) return null;
    return mapProduct(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

async function getRelatedProducts(dispensaryId: string, currentProductId: string): Promise<Product[]> {
  try {
    const rows = await query<any[]>('SELECT * FROM `product` WHERE dispensaryId = ? AND id != ? LIMIT 4', [dispensaryId, currentProductId]);
    return rows.map(mapProduct);
  } catch (error) {
    console.error("Error fetching related products:", error);
    return [];
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string, productSlug: string }> }) {
  const { slug, productSlug } = await params;
  const dispensary = await getDispensaryBySlug(slug);

  if (!dispensary || !dispensary.id) {
    notFound();
  }

  const product = await getProductBySlug(dispensary.id, productSlug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(dispensary.id, product.id);

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <HeaderProvider />
      <ProductDetailClient product={product} dispensary={dispensary} relatedProducts={relatedProducts} />
      <Footer />
    </div>
  );
}
