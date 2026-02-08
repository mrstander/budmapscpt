import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import type { Dispensary, Category, Product } from '@/lib/types';
import { notFound } from 'next/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Leaf, Flame, Cookie, Droplets, Cigarette, Sparkles, Package } from 'lucide-react';
import DealProductCard from '@/components/deal-product-card';
import { query } from '@/lib/db';

type ProductWithDispensary = Product & { dispensary: Dispensary };

const categories: Category[] = [
  { id: 'flower', name: 'Flower', imageId: 'category-flower', icon: Leaf },
  { id: 'vapes', name: 'Vapes', imageId: 'category-vape', icon: Flame },
  { id: 'edibles', name: 'Edibles', imageId: 'category-edible', icon: Cookie },
  { id: 'concentrates', name: 'Concentrates', imageId: 'category-concentrate', icon: Droplets },
  { id: 'prerolls', name: 'Pre-rolls', imageId: 'category-preroll', icon: Cigarette },
  { id: 'soda', name: 'Soda', imageId: 'category-soda', icon: Sparkles },
  { id: 'cbd', name: 'CBD', imageId: 'category-cbd', icon: Sparkles },
];

const categorySlugToProductType = (slug: string): Product['type'] | null => {
  const mapping: { [key: string]: Product['type'] } = {
    'flower': 'Flower',
    'vapes': 'Vape',
    'edibles': 'Edible',
    'concentrates': 'Concentrate',
    'prerolls': 'Pre-roll',
    'soda': 'Soda',
  };
  if (slug === 'cbd') return null;
  return mapping[slug] || null;
}

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

const mapProduct = (p: any, d?: any): ProductWithDispensary => ({
  ...p,
  pricing: typeof p.pricing === 'string' ? JSON.parse(p.pricing) : p.pricing,
  ediblePricing: typeof p.ediblePricing === 'string' ? JSON.parse(p.ediblePricing) : p.ediblePricing,
  sodaPricing: typeof p.sodaPricing === 'string' ? JSON.parse(p.sodaPricing) : p.sodaPricing,
  additionalImageUrls: typeof p.additionalImageUrls === 'string' ? JSON.parse(p.additionalImageUrls) : p.additionalImageUrls,
  createdAt: serializeDate(p.createdAt),
  updatedAt: serializeDate(p.updatedAt),
  isFeatured: Boolean(p.isFeatured),
  isHotDeal: Boolean(p.isHotDeal),
  dispensary: d ? mapDispensary(d) : undefined,
} as ProductWithDispensary);

async function getProductsByCategory(categorySlug: string): Promise<ProductWithDispensary[]> {
  try {
    const productType = categorySlugToProductType(categorySlug);

    let sql = '';
    let params: any[] = [];

    if (categorySlug === 'cbd') {
      sql = `
        SELECT p.*, d.name as dispensaryName, d.slug as dispensarySlug, d.isFeatured as dIsFeatured, d.imageUrl as dImageUrl, d.city as dCity, d.state as dState, d.suburb as dSuburb
        FROM \`product\` p
        JOIN \`dispensary\` d ON p.dispensaryId = d.id
        WHERE p.cbd > 0
      `;
    } else if (productType) {
      sql = `
        SELECT p.*, d.name as dispensaryName, d.slug as dispensarySlug, d.isFeatured as dIsFeatured, d.imageUrl as dImageUrl, d.city as dCity, d.state as dState, d.suburb as dSuburb
        FROM \`product\` p
        JOIN \`dispensary\` d ON p.dispensaryId = d.id
        WHERE p.type = ?
      `;
      params = [productType];
    } else {
      return [];
    }

    const rows = await query<any[]>(sql, params);
    return rows.map(r => {
      const { dispensaryName, dispensarySlug, dIsFeatured, dImageUrl, dCity, dState, dSuburb, ...p } = r;
      return mapProduct(p, {
        id: p.dispensaryId,
        name: dispensaryName,
        slug: dispensarySlug,
        isFeatured: dIsFeatured,
        imageUrl: dImageUrl,
        city: dCity,
        state: dState,
        suburb: dSuburb
      });
    });

  } catch (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categories.find(c => c.id === slug);

  if (!category) {
    notFound();
  }

  const products = await getProductsByCategory(slug);

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <HeaderProvider />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{category.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline mt-4">
            All {category.name} Products
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Browse all {category.name.toLowerCase()} products available from dispensaries near you.
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {products.map((product) => (
              <DealProductCard key={`${product.dispensaryId}-${product.id}`} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold">No Products Found</h2>
            <p className="text-muted-foreground mt-2">There are currently no products listed in the {category.name} category.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
