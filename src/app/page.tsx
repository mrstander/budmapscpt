import Image from 'next/image';
import Link from 'next/link';
import { Leaf, Flame, Cookie, Droplets, Cigarette, Sparkles, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Category, Dispensary, Region, Product, ProductWithDispensary } from '@/lib/types';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import DealProductCard from '@/components/deal-product-card';
import { query } from '@/lib/db';

const allCategories: Category[] = [
  { id: 'flower', name: 'Flower', imageId: 'category-flower', icon: Leaf },
  { id: 'vapes', name: 'Vapes', imageId: 'category-vape', icon: Flame },
  { id: 'edibles', name: 'Edibles', imageId: 'category-edible', icon: Cookie },
  { id: 'concentrates', name: 'Concentrates', imageId: 'category-concentrate', icon: Droplets },
  { id: 'prerolls', name: 'Pre-rolls', imageId: 'category-preroll', icon: Cigarette },
  { id: 'cbd', name: 'CBD', imageId: 'category-cbd', icon: Sparkles },
];

const categoryIdToProductType: { [key: string]: Product['type'] } = {
  'flower': 'Flower',
  'vapes': 'Vape',
  'edibles': 'Edible',
  'concentrates': 'Concentrate',
  'prerolls': 'Pre-roll',
  'soda': 'Soda'
};

const getPlaceholderImage = (id: string) => {
  const image = PlaceHolderImages.find(p => p.id === id);
  if (!image) {
    return { imageUrl: 'https://picsum.photos/seed/default/600/400', imageHint: 'placeholder' };
  }
  return { imageUrl: image.imageUrl, imageHint: image.imageHint };
};

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

async function getDispensaries(featuredOnly: boolean = false): Promise<Dispensary[]> {
  try {
    const sql = featuredOnly
      ? 'SELECT * FROM `dispensary` WHERE isFeatured = 1'
      : 'SELECT * FROM `dispensary`';
    const rows = await query<any[]>(sql);
    return rows.map(mapDispensary);
  } catch (error) {
    console.error("Error fetching dispensaries:", error);
    return [];
  }
}

async function getHotDeals(): Promise<ProductWithDispensary[]> {
  try {
    const sql = `
      SELECT p.*, d.name as dispensaryName, d.slug as dispensarySlug, d.isFeatured as dIsFeatured, d.imageUrl as dImageUrl, d.city as dCity, d.state as dState, d.suburb as dSuburb
      FROM \`product\` p
      JOIN \`dispensary\` d ON p.dispensaryId = d.id
      WHERE p.isHotDeal = 1
    `;
    const rows = await query<any[]>(sql);
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
    console.error("Error fetching hot deals:", error);
    return [];
  }
}

async function getFeaturedProducts(): Promise<ProductWithDispensary[]> {
  try {
    const sql = `
      SELECT p.*, d.name as dispensaryName, d.slug as dispensarySlug, d.isFeatured as dIsFeatured, d.imageUrl as dImageUrl, d.city as dCity, d.state as dState, d.suburb as dSuburb
      FROM \`product\` p
      JOIN \`dispensary\` d ON p.dispensaryId = d.id
      WHERE p.isFeatured = 1
    `;
    const rows = await query<any[]>(sql);
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
    console.error("Error fetching featured products:", error);
    return [];
  }
}

async function getAvailableCategories(): Promise<Category[]> {
  try {
    const distinctTypesRows = await query<any[]>('SELECT DISTINCT type FROM `product`');
    const foundTypes = new Set(distinctTypesRows.map(r => r.type));

    const rows = await query<any[]>('SELECT * FROM `product` WHERE isHotDeal = 1 LIMIT 10');
    const hasCbdProduct = rows.length > 0;

    return allCategories.filter(category => {
      if (category.id === 'cbd') return hasCbdProduct;
      const productType = categoryIdToProductType[category.id];
      return productType ? foundTypes.has(productType) : false;
    });
  } catch (error) {
    console.error("Error fetching available categories:", error);
    return allCategories;
  }
}

function generateRegionsFromDispensaries(dispensaries: Dispensary[]): Region[] {
  const regionsMap: { [state: string]: { slug: string; cities: Set<string> } } = {};

  dispensaries.forEach(dispensary => {
    if (dispensary.state && dispensary.city) {
      if (!regionsMap[dispensary.state]) {
        regionsMap[dispensary.state] = {
          slug: dispensary.state.toLowerCase().replace(/\s+/g, '-'),
          cities: new Set(),
        };
      }
      regionsMap[dispensary.state].cities.add(dispensary.city);
    }
  });

  return Object.entries(regionsMap).map(([state, { slug, cities }]) => ({
    state,
    slug,
    cities: Array.from(cities).sort(),
  }));
}

export default async function Home() {
  const featuredDispensaries = await getDispensaries(true);
  const allDispensaries = await getDispensaries(false);
  const hotDeals = await getHotDeals();
  const featuredProducts = await getFeaturedProducts();
  const availableCategories = await getAvailableCategories();

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <HeaderProvider />
      <main className="flex-grow">
        <section className="py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Link href="/deals" className="block relative rounded-xl overflow-hidden h-[500px] group">
                  <Image src="https://plus.unsplash.com/premium_photo-1695229820933-fa53194ed81f?q=80&w=687&auto=format&fit=crop" alt="Promotion" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors"></div>
                  <div className="absolute bottom-0 left-0 p-8 text-white">
                    <h2 className="text-3xl font-bold">Hot Deals</h2>
                    <p>Check out the latest sales.</p>
                  </div>
                </Link>
              </div>

              <div className="flex flex-col gap-6">
                <Link href="#" className="block relative rounded-xl overflow-hidden h-full group">
                  <Image src="https://images.unsplash.com/photo-1621335891390-3b03d7e5e8e3?q=80&w=1074&auto=format&fit=crop" alt="Fast Delivery" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>
                  <div className="absolute bottom-0 left-0 p-6 text-white">
                    <h3 className="text-2xl font-bold">Fast Delivery</h3>
                    <p className="text-sm">Get your order in minutes</p>
                  </div>
                </Link>
                <Link href="/deals" className="block relative rounded-xl overflow-hidden h-full group">
                  <Image src="https://images.unsplash.com/photo-1556928045-16f7f50be0f3?q=80&w=1974&auto=format&fit=crop" alt="Promotion" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors"></div>
                  <div className="absolute bottom-0 left-0 p-6 text-white">
                    <h2 className="text-2xl font-bold">New Arrivals</h2>
                    <p>Explore the freshest products.</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 bg-card">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-center font-headline">Featured Dispensaries</h2>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {featuredDispensaries.map((dispensary) => {
                const imageUrl = dispensary.imageUrl || getPlaceholderImage('dispensary-1').imageUrl;
                return (
                  <Link key={dispensary.id || dispensary.slug} href={`/dispensary/${dispensary.slug}`}>
                    <Card className="overflow-hidden group transition-all duration-300 hover:shadow-primary/20 hover:shadow-lg hover:-translate-y-1 h-full">
                      <div className="aspect-video relative overflow-hidden">
                        <Image src={imageUrl} alt={dispensary.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg">{dispensary.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center mt-1">
                          <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                          {dispensary.suburb ? `${dispensary.suburb}, ` : ''}{dispensary.city}, {dispensary.state}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {featuredProducts.length > 0 && (
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold tracking-tight text-center font-headline mb-10">Featured Products</h2>
              <Carousel opts={{ align: "start", loop: featuredProducts.length > 4 }} className="w-full">
                <CarouselContent>
                  {featuredProducts.map((product) => (
                    <CarouselItem key={product.id} className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                      <div className="p-2 h-full">
                        <DealProductCard product={product} />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
              </Carousel>
            </div>
          </section>
        )}

        {hotDeals.length > 0 && (
          <section className="py-12 md:py-16 bg-muted/20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold tracking-tight text-center font-headline mb-10">Todays Hot Deals</h2>
              <Carousel opts={{ align: "start", loop: hotDeals.length > 4 }} className="w-full">
                <CarouselContent>
                  {hotDeals.map((product) => (
                    <CarouselItem key={product.id} className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                      <div className="p-2 h-full">
                        <DealProductCard product={product} />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
              </Carousel>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
