'use client';

import { Product, Dispensary } from '@/lib/types';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const getPlaceholderImage = (id: string) => {
    const image = PlaceHolderImages.find(p => p.id === id);
    if (!image) {
        return { imageUrl: 'https://picsum.photos/seed/product/400/400', imageHint: 'product placeholder' };
    }
    return { imageUrl: image.imageUrl, imageHint: image.imageHint };
};

const isSaleActive = (product: Product) => {
    if (product.salePrice && product.salePrice > 0) return true;
    if (product.type === 'Edible' && product.ediblePricing) {
        return product.ediblePricing.some(tier => tier.salePrice && tier.salePrice > 0);
    }
    if (product.type === 'Soda' && product.sodaPricing) {
        return product.sodaPricing.some(tier => tier.salePrice && tier.salePrice > 0);
    }
    return false;
}

interface ProductCardProps {
    product: Product;
    dispensary: Dispensary;
    isOpen?: boolean;
    showDispensary?: boolean;
}

export const ProductCard = ({ product, dispensary, isOpen = true, showDispensary = false }: ProductCardProps) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { addToCart } = useCart();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toast } = useToast();
    const { data: session } = useSession();

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const canShop = !session?.user || session?.user?.role === 'user';

    const { imageUrl: placeholderUrl, imageHint } = getPlaceholderImage(product.imageId || 'category-flower');
    const imageUrl = product.imageUrl || placeholderUrl;
    const productUrl = `/dispensary/${dispensary.slug}/product/${product.slug || product.id}`;

    const onSale = isSaleActive(product);

    let displayPrice: number | undefined;
    let originalPrice: number | undefined;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let totalStock = useMemo(() => {
        if (product.type === 'Flower' && product.pricing && product.pricing.length > 0) {
            return product.pricing.reduce((sum: number, tier: any) => sum + tier.stock, 0);
        } else if (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) {
            return product.ediblePricing.reduce((sum: number, tier: any) => sum + tier.stock, 0);
        } else if (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0) {
            return product.sodaPricing.reduce((sum: number, tier: any) => sum + tier.stock, 0);
        } else {
            return product.stock || 0;
        }
    }, [product]);

    if (product.type === 'Flower' && product.pricing && product.pricing.length > 0) {
        const firstTier = product.pricing[0];
        displayPrice = onSale && product.salePrice ? product.salePrice : firstTier.price;
        if (onSale && product.salePrice) originalPrice = firstTier.price;
    } else if (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) {
        const firstTier = product.ediblePricing[0];
        displayPrice = firstTier.salePrice || firstTier.price;
        if (firstTier.salePrice) originalPrice = firstTier.price;
    } else if (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0) {
        const firstTier = product.sodaPricing[0];
        displayPrice = firstTier.salePrice || firstTier.price;
        if (firstTier.salePrice) originalPrice = firstTier.price;
    } else {
        displayPrice = onSale ? product.salePrice : product.price;
        if (onSale) originalPrice = product.price;
    }

    const showOptionsButton = product.type === 'Flower' ||
        (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) ||
        (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0);

    return (
        <Card className="overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-lg h-full">
            <Link href={productUrl} className='contents'>
                <div className="aspect-square relative overflow-hidden">
                    <Image src={imageUrl} alt={product.name} fill className="object-cover transition-transform duration-300 group-hover:scale-110" data-ai-hint={imageHint} />
                    {onSale && (
                        <Badge className="absolute top-2 left-2" variant="destructive">SALE</Badge>
                    )}
                    <Badge className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-foreground hover:bg-background/90" variant="outline">
                        {product.type}
                    </Badge>
                </div>
                <CardContent className="p-4 flex flex-col flex-grow">
                    {showDispensary && (
                        <Link href={`/dispensary/${dispensary.slug}`}>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors mb-1">
                                <MapPin className="w-3 h-3" />
                                {dispensary.name}
                            </p>
                        </Link>
                    )}
                    <div className="flex justify-between items-center font-semibold ">
                        <div className="flex items-baseline gap-2">
                            <span className={cn("text-md font-bold", onSale ? 'text-destructive' : 'text-foreground')}>
                                {showOptionsButton
                                    ? `From R${(displayPrice || 0).toFixed(2)}`
                                    : `R${(displayPrice || 0).toFixed(2)}`
                                }
                            </span>
                            {onSale && originalPrice && (
                                <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                                    {`R${originalPrice.toFixed(2)}`}
                                </span>
                            )}
                        </div>
                    </div>
                    <h3 className="font-normal text-lg leading-tight group-hover:text-primary transition-colors">{product.name}</h3>

                </CardContent>
            </Link>

        </Card>
    );
};
