import { Product, Dispensary } from '@/lib/types';
import ProductsClientPage from './client-page';
import HeaderProvider from '@/components/layout/header-provider';
import Footer from '@/components/layout/footer';
import { query } from '@/lib/db';

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

const mapProduct = (p: any, d?: any): (Product & { dispensary: Dispensary }) => ({
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
} as Product & { dispensary: Dispensary });

async function getData() {
    try {
        const sql = `
            SELECT p.*, d.name as dispensaryName, d.slug as dispensarySlug, d.isFeatured as dIsFeatured, d.imageUrl as dImageUrl, d.city as dCity, d.state as dState, d.suburb as dSuburb
            FROM \`product\` p
            JOIN \`dispensary\` d ON p.dispensaryId = d.id
        `;
        const rows = await query<any[]>(sql);

        return {
            products: rows.map(r => {
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
            })
        };
    } catch (error) {
        console.error("Detailed error in getData:", error);
        return {
            products: []
        };
    }
}

export default async function ProductsPage() {
    const { products } = await getData();

    return (
        <div className="flex flex-col min-h-dvh bg-background text-foreground">
            <HeaderProvider />
            {/* @ts-ignore */}
            <ProductsClientPage initialProducts={products} />
            <Footer />
        </div>
    );
}
