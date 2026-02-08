'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Product, Dispensary, ProductWithDispensary } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

interface DealProductCardProps {
    product: ProductWithDispensary;
    hidePrice?: boolean;
}

const getPlaceholderImage = (id?: string) => {
    const image = PlaceHolderImages.find(p => p.id === id);
    return image || { imageUrl: 'https://picsum.photos/seed/product/400/400', imageHint: 'product placeholder' };
};

const getLowestPrice = (product: Product): { salePrice: number | null, originalPrice: number | null } => {
    let salePrice: number | null = null;
    let originalPrice: number | null = null;

    if (product.salePrice) {
        salePrice = product.salePrice;
        originalPrice = product.price || null;
    }

    if (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) {
        const tierPrices = product.ediblePricing
            .filter(p => p.salePrice && p.salePrice > 0)
            .map(p => ({ salePrice: p.salePrice!, originalPrice: p.price }));

        if (tierPrices.length > 0) {
            const lowestTier = tierPrices.reduce((min, p) => p.salePrice < min.salePrice ? p : min, tierPrices[0]);
            if (salePrice === null || lowestTier.salePrice < salePrice) {
                salePrice = lowestTier.salePrice;
                originalPrice = lowestTier.originalPrice;
            }
        }
    }

    if (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0) {
        const tierPrices = product.sodaPricing
            .filter(p => p.salePrice && p.salePrice > 0)
            .map(p => ({ salePrice: p.salePrice!, originalPrice: p.price }));

        if (tierPrices.length > 0) {
            const lowestTier = tierPrices.reduce((min, p) => p.salePrice < min.salePrice ? p : min, tierPrices[0]);
            if (salePrice === null || lowestTier.salePrice < salePrice) {
                salePrice = lowestTier.salePrice;
                originalPrice = lowestTier.originalPrice;
            }
        }
    }

    if (salePrice === null && originalPrice === null && product.price) {
        originalPrice = product.price;
    }

    if (salePrice === null && product.price) {
        salePrice = product.price;
    }


    return { salePrice, originalPrice };
}


const DealProductCard = ({ product, hidePrice = false }: DealProductCardProps) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { addToCart } = useCart();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toast } = useToast();
    const { data: session } = useSession();

    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const canShop = !session?.user || session?.user?.role === 'user';

    const { imageUrl: placeholderUrl, imageHint } = getPlaceholderImage(product.imageId);
    const imageUrl = product.imageUrl || placeholderUrl;

    const productUrl = `/dispensary/${product.dispensary.slug}/product/${product.slug || product.id}`;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const totalStock = useMemo(() => {
        if (product.type === 'Flower' && product.pricing && product.pricing.length > 0) {
            return product.pricing.reduce((sum, tier) => sum + tier.stock, 0);
        } else if (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) {
            return product.ediblePricing.reduce((sum, tier) => sum + tier.stock, 0);
        } else if (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0) {
            return product.sodaPricing.reduce((sum, tier) => sum + tier.stock, 0);
        } else {
            return product.stock || 0;
        }
    }, [product]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { salePrice: displayPrice, originalPrice } = getLowestPrice(product);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleAddToCart = () => {
        if (displayPrice === null) return;

        let productToAdd: Product;

        if (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) {
            const firstTier = product.ediblePricing[0];
            productToAdd = {
                ...product,
                price: firstTier.salePrice || firstTier.price,
                // @ts-ignore
                weight: firstTier.strength,
                stock: firstTier.stock
            }
        } else if (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0) {
            const firstTier = product.sodaPricing[0];
            productToAdd = {
                ...product,
                price: firstTier.salePrice || firstTier.price,
                // @ts-ignore
                weight: firstTier.flavour,
                stock: firstTier.stock
            }
        }
        else {
            productToAdd = {
                ...product,
                price: displayPrice,
                weight: product.weight || product.pricing?.[0]?.weight || '',
            }
        }

        addToCart(productToAdd, product.dispensary);
        toast({
            title: "Added to cart",
            description: `${product.name} from ${product.dispensary.name}`,
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const showOptionsButton = product.type === 'Flower' ||
        (product.type === 'Edible' && product.ediblePricing && product.ediblePricing.length > 0) ||
        (product.type === 'Soda' && product.sodaPricing && product.sodaPricing.length > 0);

    return (
        <Card className="overflow-hidden flex flex-col group transition-shadow duration-300 hover:shadow-lg h-full">
            <Link href={productUrl} className="contents">
                <div className="aspect-square relative overflow-hidden">
                    <Image src={imageUrl} alt={product.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" data-ai-hint={imageHint} />
                    {(product.salePrice || product.isHotDeal) && (
                        <Badge className="absolute top-2 left-2" variant="destructive">SALE</Badge>
                    )}
                </div>
            </Link>
            <CardContent className="p-4 flex flex-col flex-grow">
                <Link href={`/dispensary/${product.dispensary.slug}`}>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 hover:text-primary transition-colors">
                        <MapPin className="w-3.5 h-3.5" />
                        {product.dispensary.name}
                    </p>
                </Link>
                <Link href={productUrl} className="flex-grow">
                    <h3 className="font-semibold text-lg mt-1">{product.name}</h3>
                </Link>
            </CardContent>
            {!hidePrice && (
                <div className="p-4 pt-0">
                    <div className="space-y-2 mb-4">
                        {/* Flower Pricing */}
                        {product.type === 'Flower' && product.pricing?.map((tier, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">{tier.weight}</span>
                                <span className="font-bold">R{tier.price.toFixed(2)}</span>
                            </div>
                        ))}

                        {/* Edible Pricing */}
                        {product.type === 'Edible' && product.ediblePricing?.map((tier, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">{tier.strength}</span>
                                <div className="flex gap-2">
                                    {(tier.salePrice && tier.salePrice > 0) ? (
                                        <>
                                            <span className="text-muted-foreground line-through text-xs">R{tier.price.toFixed(2)}</span>
                                            <span className="font-bold text-destructive">R{tier.salePrice.toFixed(2)}</span>
                                        </>
                                    ) : (
                                        <span className="font-bold">R{tier.price.toFixed(2)}</span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Soda Pricing */}
                        {product.type === 'Soda' && product.sodaPricing?.map((tier, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">{tier.flavour}</span>
                                <div className="flex gap-2">
                                    {(tier.salePrice && tier.salePrice > 0) ? (
                                        <>
                                            <span className="text-muted-foreground line-through text-xs">R{tier.price.toFixed(2)}</span>
                                            <span className="font-bold text-destructive">R{tier.salePrice.toFixed(2)}</span>
                                        </>
                                    ) : (
                                        <span className="font-bold">R{tier.price.toFixed(2)}</span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Simple Product Pricing (Standard/Concentrate/Vape/Pre-roll) */}
                        {!['Flower', 'Edible', 'Soda'].includes(product.type) && (
                            <div className="flex justify-between items-center font-semibold">
                                <div className="flex items-baseline gap-2">
                                    <span className={product.salePrice ? "text-xl font-bold text-destructive" : "text-xl font-bold"}>
                                        {`R${(product.salePrice || product.price || 0).toFixed(2)}`}
                                    </span>
                                    {product.salePrice && product.price && (
                                        <span className="text-sm text-muted-foreground line-through">
                                            R{product.price.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm text-muted-foreground font-normal">
                                    {product.weight}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
};

export default DealProductCard;
